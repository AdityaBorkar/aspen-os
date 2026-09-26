import { managedOrganization } from "#/db-schemas";
import { ORGANIZATION_EVENTS } from "#/pubsub";
import { RemoveLogoSchema } from "#/schemas/logo";
import { removeLogoObject } from "#/services/logo-storage";
import { brandingWithLogo, readBrandingLogo } from "#/services/organization-branding";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOrganizationStep } from "#/workflow-steps/fetch-organization";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

/**
 * Remove a managed-organization logo.
 *
 * Deletes the Storage object behind `branding.logo` and clears the key to
 * `null`, preserving other branding fields.
 */
export const removeOrganizationLogo = Workflow.name("organization.logo.remove")
  .input(RemoveLogoSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, { id: input.id });
    const storageKey = readBrandingLogo(current.branding);
    if (!storageKey) {
      return current;
    }

    await ctx.step.run("remove-storage", async () => {
      await removeLogoObject(storageKey).catch(() => undefined);
    });

    await ctx.step.run("clear-reference", async () => {
      const branding = brandingWithLogo(current.branding, null);
      const [updated] = await ctx.db
        .update(managedOrganization)
        .set({ branding, updated_at: new Date() })
        .where(eq(managedOrganization.id, input.id))
        .returning();
      if (!updated) {
        throw new Error(`Organization with id "${input.id}" not found.`);
      }
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ORGANIZATION_LOGO_REMOVED,
        crudAction: "update",
        entityId: input.id,
        entityType: AUDIT_ENTITY_TYPE.ORGANIZATION,
      });
      await ctx.pubsub.publish(ORGANIZATION_EVENTS.UPDATED, {
        changes: { branding: { logo: null } },
        organization: { id: input.id, name: current.name },
      });
    });

    return ctx.step.run(fetchOrganizationStep, { id: input.id });
  });
