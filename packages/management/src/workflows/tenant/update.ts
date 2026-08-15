import { tenant } from "#/db-schemas";
import { TENANT_EVENTS } from "#/pubsub";
import { IdSchema, UpdateTenantCompanionSchema, UpdateTenantProfileSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchTenantStep } from "#/workflow-steps/fetch-tenant";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object, optional } from "valibot";

export const updateTenant = Workflow.name("tenant.update")
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
      if (!profile) {
        return;
      }
      const data = stripUndefined(profile);
      if (Object.keys(data).length === 0) {
        return;
      }

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
      if (!companion) {
        return;
      }
      const data = stripUndefined(companion);
      if (Object.keys(data).length === 0) {
        return;
      }

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
      if (profile) {
        Object.assign(changes, stripUndefined(profile));
      }
      if (companion) {
        Object.assign(changes, stripUndefined(companion));
      }
      if (Object.keys(changes).length === 0) {
        return;
      }

      await ctx.audit.write({
        action: AUDIT_ACTION.TENANT_PROFILE_UPDATED,
        changes,
        crudAction: "update",
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
