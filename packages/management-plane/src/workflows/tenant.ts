import {
  type DatabaseUnit,
  type TenantDbConfig,
  Workflow,
  WorkflowStep,
} from "@aspen-os/platform/server";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import pg from "pg";
import { object, optional, parse } from "valibot";

import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../constants";
import { organization, tenant } from "../db-schemas";
import { TENANT_EVENTS } from "../pubsub-events";
import {
  IdSchema,
  ProvisionTenantSchema,
  TenantFiltersSchema,
  UpdateTenantCompanionSchema,
  UpdateTenantProfileSchema,
} from "../types";
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
        const api = auth.api as unknown as {
          createOrganization: (opts: unknown) => Promise<unknown>;
        };
        return (await api.createOrganization({
          body: {
            logo: parsed.logo ?? undefined,
            name: parsed.name,
            slug: parsed.slug,
            userId: parsedUserId,
          },
        } as Record<string, unknown>)) as { id: string };
      });

      const tenantId = org.id;

      const dbConfig: TenantDbConfig = await ctx.step.run(
        "create-tenant-infra",
        async () => {
          return dbUnit.createTenant(tenantId, {
            databaseName: parsed.databaseName ?? undefined,
            host: parsed.databaseHost ?? undefined,
            password: parsed.databasePassword ?? undefined,
            port: parsed.databasePort ?? undefined,
            ssl: parsed.databaseSsl ?? undefined,
            user: parsed.databaseUser ?? undefined,
          });
        },
      );

      await ctx.step.run("seed-profile", async () => {
        const pool = new pg.Pool({
          database: dbConfig.database,
          host: dbConfig.host,
          password: dbConfig.password,
          port: dbConfig.port,
          ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
          user: dbConfig.user,
        });
        try {
          await pool.query(
            "INSERT INTO organization (id, name, slug, logo) VALUES ($1, $2, $3, $4)",
            [tenantId, parsed.name, parsed.slug, parsed.logo ?? null],
          );
        } finally {
          await pool.end();
        }
      });

      await ctx.step.run("record-tenant", async () => {
        await ctx.db.insert(tenant).values({
          databaseHost: dbConfig.host,
          databaseName: dbConfig.database,
          databasePassword: dbConfig.password,
          databasePort: dbConfig.port,
          databaseSsl: dbConfig.ssl,
          databaseUser: dbConfig.user,
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

export function createTenants(dbUnit: DatabaseUnit) {
  return {
    get: getTenant,
    list: listTenants,
    onboard: createOnboardTenant(dbUnit),
    update: updateTenant,
  };
}
