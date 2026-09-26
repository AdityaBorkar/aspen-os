import { TENANT_EVENTS } from "#/pubsub";
import { RemoveLogoSchema } from "#/schemas/logo";
import { removeLogoObject } from "#/services/logo-storage";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchTenantStep } from "#/workflow-steps/fetch-tenant";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";

/**
 * Remove a tenant logo.
 *
 * Deletes the Storage object behind `organization.logo` and clears the column
 * to `null`. Missing logos are a no-op returning the current tenant.
 */
export const removeTenantLogo = Workflow.name("tenant.logo.remove")
  .input(RemoveLogoSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchTenantStep, { id: input.id });
    const storageKey = current.logo;
    if (!storageKey) {
      return current;
    }

    await ctx.step.run("remove-storage", async () => {
      await removeLogoObject(storageKey).catch(() => undefined);
    });

    await ctx.step.run("clear-reference", async () => {
      const [updated] = await ctx.db
        .update(organization)
        .set({ logo: null })
        .where(eq(organization.id, input.id))
        .returning();
      if (!updated) {
        throw new Error(`Tenant with id "${input.id}" not found.`);
      }
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.TENANT_LOGO_REMOVED,
        crudAction: "update",
        entityId: input.id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
      });
      await ctx.pubsub.publish(TENANT_EVENTS.PROFILE_UPDATED, {
        changes: { logo: null },
        tenantId: input.id,
      });
    });

    return ctx.step.run(fetchTenantStep, { id: input.id });
  });
