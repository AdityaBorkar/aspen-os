import {
  type DatabaseUnit,
  type IsolatedTenantProvisioningResult,
  Workflow,
  WorkflowStep,
} from "@aspen-os/platform/server";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import { object, optional, parse, string } from "valibot";

import { organization, serviceProvider, tenant } from "../db-schemas";
import { TENANT_EVENTS } from "../pubsub";
import {
  IdSchema,
  ProvisionTenantSchema,
  TenantFiltersSchema,
  UpdateTenantCompanionSchema,
  UpdateTenantProfileSchema,
} from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { logAuditStep } from "./steps/log-audit";
import { stripUndefined } from "./utils";

const fetchTenantStep = WorkflowStep.name("fetch-tenant")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [org] = await ctx.db
      .select()
      .from(organization)
      .where(eq(organization.id, input.id))
      .limit(1);

    if (!org) {
      throw new Error(`Tenant with id "${input.id}" not found.`);
    }

    const [companion] = await ctx.db
      .select()
      .from(tenant)
      .where(eq(tenant.id, input.id))
      .limit(1);

    return { ...org, ...companion };
  });

function createOnboardTenant(dbUnit: DatabaseUnit) {
  return Workflow.name("tenant.onboard")
    .input(
      object({
        tenant: ProvisionTenantSchema,
        userId: IdSchema,
      }),
    )
    .handler(async (input, ctx) => {
      if (!ctx.auth) throw new Error("Auth is required for provisioning");
      const auth = ctx.auth;
      const parsed = input.tenant;
      const parsedUserId = parse(IdSchema, input.userId);

      const org = await ctx.step.run("create-organization", async () => {
        return auth.service.api.createOrganization({
          body: {
            logo: parsed.logo ?? undefined,
            name: parsed.name,
            slug: parsed.slug,
            userId: parsedUserId,
          },
        });
      });

      const tenantId = org.id;

      let provisioningResult: Awaited<
        ReturnType<DatabaseUnit["provisionTenant"]>
      >;

      try {
        provisioningResult = await ctx.step.run(
          "provision-tenant",
          async () => {
            return dbUnit.provisionTenant(tenantId, {
              databaseName: parsed.databaseName ?? undefined,
              host: parsed.databaseHost ?? undefined,
              password: parsed.databasePassword ?? undefined,
              port: parsed.databasePort ?? undefined,
              ssl: parsed.databaseSsl ?? undefined,
              user: parsed.databaseUser ?? undefined,
            });
          },
        );
      } catch (err) {
        console.error(
          `Provisioning failed for tenant "${tenantId}", cleaning up organization`,
          err,
        );
        try {
          await auth.service.api.deleteOrganization({
            body: { organizationId: tenantId },
            headers: new Headers(),
          });
        } catch (cleanupErr) {
          console.error(
            `Failed to cleanup organization "${tenantId}"`,
            cleanupErr,
          );
        }
        throw err;
      }

      if (provisioningResult.tenancyMode === "isolated") {
        const dbConfig = provisioningResult as IsolatedTenantProvisioningResult;
        await ctx.step.run("seed-profile", async () => {
          await dbUnit.seedTenantDb(dbConfig, async (tenantDb) => {
            await tenantDb.insert(organization).values({
              createdAt: new Date(),
              id: tenantId,
              logo: parsed.logo ?? null,
              name: parsed.name,
              slug: parsed.slug,
            });
          });
        });
      }

      await ctx.step.run("record-tenant", async () => {
        await ctx.db.insert(tenant).values({
          databaseHost:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.database
              : null,
          databaseName:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.database
              : null,
          databasePassword:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.password
              : null,
          databasePort:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.port
              : null,
          databaseSsl:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.ssl
              : null,
          databaseUser:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.user
              : null,
          id: tenantId,
          plan: parsed.plan ?? null,
          serviceProviderId: parsed.serviceProviderId ?? null,
          signupAt: new Date(),
          status: "onboarding",
        });
      });

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.step.run(logAuditStep, {
          action: AUDIT_ACTION.TENANT_PROVISIONED,
          entityId: tenantId,
          entityType: AUDIT_ENTITY_TYPE.TENANT,
          newState: {
            name: parsed.name,
            plan: parsed.plan ?? null,
            serviceProviderId: parsed.serviceProviderId ?? null,
            slug: parsed.slug,
            status: "onboarding",
          },
        });

        await ctx.pubsub.publish(TENANT_EVENTS.PROVISIONED, {
          serviceProviderId: parsed.serviceProviderId ?? undefined,
          tenantId,
        });
      });

      return { tenantId };
    });
}

const getTenant = Workflow.name("tenant.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    return ctx.step.run(fetchTenantStep, input);
  });

const listTenants = Workflow.name("tenant.list")
  .input(
    object({
      filters: optional(TenantFiltersSchema),
    }),
  )
  .handler(async (input, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters
        ? parse(TenantFiltersSchema, input.filters)
        : {};
      const conditions: SQL[] = [];

      if (parsed.status) {
        conditions.push(
          eq(
            tenant.status,
            parsed.status as (typeof tenant.status.enumValues)[number],
          ),
        );
      }
      if (parsed.plan) {
        conditions.push(eq(tenant.plan, parsed.plan));
      }
      if (parsed.serviceProviderId) {
        conditions.push(eq(tenant.serviceProviderId, parsed.serviceProviderId));
      }
      if (parsed.search) {
        const term = `%${parsed.search}%`;
        conditions.push(
          or(
            ilike(organization.name, term),
            ilike(organization.slug, term),
          ) as SQL,
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select({
          createdAt: organization.createdAt,
          id: organization.id,
          logo: organization.logo,
          name: organization.name,
          plan: tenant.plan,
          serviceProviderId: tenant.serviceProviderId,
          signupAt: tenant.signupAt,
          slug: organization.slug,
          status: tenant.status,
        })
        .from(tenant)
        .leftJoin(organization, eq(organization.id, tenant.id))
        .where(whereClause);
    });
  });

const updateTenant = Workflow.name("tenant.update")
  .input(
    object({
      companion: optional(UpdateTenantCompanionSchema),
      id: IdSchema,
      profile: optional(UpdateTenantProfileSchema),
    }),
  )
  .handler(async (input, ctx) => {
    const { id: tenantId, profile, companion } = input;

    await ctx.step.run("update-profile", async () => {
      if (!profile) return;
      const data = stripUndefined(profile);
      if (Object.keys(data).length === 0) return;

      const [updated] = await ctx.db
        .update(organization)
        .set(data)
        .where(eq(organization.id, tenantId))
        .returning();

      if (!updated) {
        throw new Error(`Tenant with id "${tenantId}" not found.`);
      }
    });

    await ctx.step.run("update-companion", async () => {
      if (!companion) return;
      const data = stripUndefined(companion);
      if (Object.keys(data).length === 0) return;

      const [updated] = await ctx.db
        .update(tenant)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(tenant.id, tenantId))
        .returning();

      if (!updated) {
        throw new Error(`Tenant with id "${tenantId}" not found.`);
      }
    });

    await ctx.step.run("audit-and-notify", async () => {
      const changes: Record<string, unknown> = {};
      if (profile) Object.assign(changes, stripUndefined(profile));
      if (companion) Object.assign(changes, stripUndefined(companion));
      if (Object.keys(changes).length === 0) return;

      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.TENANT_PROFILE_UPDATED,
        changes,
        entityId: tenantId,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
      });

      await ctx.pubsub.publish(TENANT_EVENTS.PROFILE_UPDATED, {
        changes,
        tenantId,
      });
    });

    return ctx.step.run(fetchTenantStep, { id: tenantId });
  });

const activateTenant = Workflow.name("tenant.activate")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const { id } = input;

    const [current] = await ctx.db
      .select({ status: tenant.status })
      .from(tenant)
      .where(eq(tenant.id, id))
      .limit(1);

    if (!current) {
      throw new Error(`Tenant with id "${id}" not found.`);
    }
    if (current.status !== "onboarding") {
      throw new Error(
        `Cannot activate tenant "${id}" — current status is "${current.status}", expected "onboarding".`,
      );
    }

    await ctx.step.run("activate", async () => {
      await ctx.db
        .update(tenant)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(tenant.id, id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.TENANT_ACTIVATED,
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { status: "active" },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.ACTIVATED, { tenantId: id });
    });

    return ctx.step.run(fetchTenantStep, { id });
  });

const suspendTenant = Workflow.name("tenant.suspend")
  .input(
    object({
      id: IdSchema,
      reason: optional(string()),
    }),
  )
  .handler(async (input, ctx) => {
    const { id, reason } = input;

    const [current] = await ctx.db
      .select({ status: tenant.status })
      .from(tenant)
      .where(eq(tenant.id, id))
      .limit(1);

    if (!current) {
      throw new Error(`Tenant with id "${id}" not found.`);
    }
    if (current.status !== "active") {
      throw new Error(
        `Cannot suspend tenant "${id}" — current status is "${current.status}", expected "active".`,
      );
    }

    await ctx.step.run("suspend", async () => {
      await ctx.db
        .update(tenant)
        .set({
          status: "suspended",
          suspendedAt: new Date(),
          suspendedReason: reason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(tenant.id, id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.TENANT_SUSPENDED,
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { status: "suspended", suspendedReason: reason ?? null },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.SUSPENDED, {
        reason: reason ?? "unspecified",
        tenantId: id,
      });
    });

    return ctx.step.run(fetchTenantStep, { id });
  });

const reactivateTenant = Workflow.name("tenant.reactivate")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const { id } = input;

    const [current] = await ctx.db
      .select({ status: tenant.status })
      .from(tenant)
      .where(eq(tenant.id, id))
      .limit(1);

    if (!current) {
      throw new Error(`Tenant with id "${id}" not found.`);
    }
    if (current.status !== "suspended") {
      throw new Error(
        `Cannot reactivate tenant "${id}" — current status is "${current.status}", expected "suspended".`,
      );
    }

    await ctx.step.run("reactivate", async () => {
      await ctx.db
        .update(tenant)
        .set({
          status: "active",
          suspendedAt: null,
          suspendedReason: null,
          updatedAt: new Date(),
        })
        .where(eq(tenant.id, id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.TENANT_REACTIVATED,
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { status: "active" },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.REACTIVATED, { tenantId: id });
    });

    return ctx.step.run(fetchTenantStep, { id });
  });

const churnTenant = Workflow.name("tenant.churn")
  .input(
    object({
      id: IdSchema,
      reason: optional(string()),
    }),
  )
  .handler(async (input, ctx) => {
    const { id, reason } = input;

    const [current] = await ctx.db
      .select({ status: tenant.status })
      .from(tenant)
      .where(eq(tenant.id, id))
      .limit(1);

    if (!current) {
      throw new Error(`Tenant with id "${id}" not found.`);
    }
    if (current.status !== "active" && current.status !== "suspended") {
      throw new Error(
        `Cannot churn tenant "${id}" — current status is "${current.status}", expected "active" or "suspended".`,
      );
    }

    await ctx.step.run("churn", async () => {
      await ctx.db
        .update(tenant)
        .set({
          churnedAt: new Date(),
          churnReason: reason ?? null,
          status: "churned",
          updatedAt: new Date(),
        })
        .where(eq(tenant.id, id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.TENANT_CHURNED,
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { churnReason: reason ?? null, status: "churned" },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.CHURNED, {
        reason: reason ?? "unspecified",
        tenantId: id,
      });
    });

    return ctx.step.run(fetchTenantStep, { id });
  });

const assignServiceProvider = Workflow.name("tenant.assign-sp")
  .input(
    object({
      serviceProviderId: IdSchema,
      tenantId: IdSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const { tenantId, serviceProviderId } = input;

    const [sp] = await ctx.db
      .select({ id: serviceProvider.id })
      .from(serviceProvider)
      .where(eq(serviceProvider.id, serviceProviderId))
      .limit(1);

    if (!sp) {
      throw new Error(
        `Service Provider with id "${serviceProviderId}" not found.`,
      );
    }

    await ctx.step.run("assign", async () => {
      await ctx.db
        .update(tenant)
        .set({ serviceProviderId, updatedAt: new Date() })
        .where(eq(tenant.id, tenantId));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.SP_ASSIGNED,
        entityId: tenantId,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { serviceProviderId },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.SP_ASSIGNED, {
        serviceProviderId,
        tenantId,
      });
    });

    return ctx.step.run(fetchTenantStep, { id: tenantId });
  });

const unassignServiceProvider = Workflow.name("tenant.unassign-sp")
  .input(object({ tenantId: IdSchema }))
  .handler(async (input, ctx) => {
    const { tenantId } = input;

    await ctx.step.run("unassign", async () => {
      await ctx.db
        .update(tenant)
        .set({ serviceProviderId: null, updatedAt: new Date() })
        .where(eq(tenant.id, tenantId));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.SP_UNASSIGNED,
        entityId: tenantId,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
      });

      await ctx.pubsub.publish(TENANT_EVENTS.SP_UNASSIGNED, { tenantId });
    });

    return ctx.step.run(fetchTenantStep, { id: tenantId });
  });

export function createTenants(dbUnit: DatabaseUnit) {
  return {
    activate: activateTenant,
    assignServiceProvider,
    churn: churnTenant,
    get: getTenant,
    list: listTenants,
    onboard: createOnboardTenant(dbUnit),
    reactivate: reactivateTenant,
    suspend: suspendTenant,
    unassignServiceProvider,
    update: updateTenant,
  };
}
