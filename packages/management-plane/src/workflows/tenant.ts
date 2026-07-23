import { Workflow, WorkflowStep } from "@aspen-os/framework/server";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
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
import { provisionTenant } from "./provisioning";
import { logAuditStep } from "./steps";
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

const onboardTenant = Workflow.name("tenant.onboard")
  .input(
    object({
      tenant: ProvisionTenantSchema,
      userId: IdSchema,
    }),
  )
  .handler(async (input, ctx) => {
    return ctx.step.run(provisionTenant, input);
  });

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

export const tenants = {
  get: getTenant,
  list: listTenants,
  onboard: onboardTenant,
  update: updateTenant,
};
