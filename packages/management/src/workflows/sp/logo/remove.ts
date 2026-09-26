import { serviceProvider } from "#/db-schemas";
import { SERVICE_PROVIDER_EVENTS } from "#/pubsub";
import { RemoveLogoSchema } from "#/schemas/logo";
import { removeLogoObject } from "#/services/logo-storage";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchServiceProviderStep } from "#/workflow-steps/fetch-sp";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

/**
 * Remove a service-provider logo.
 *
 * Deletes the Storage object behind `service_provider.logo` and clears the
 * column to `null`.
 */
export const removeServiceProviderLogo = Workflow.name("sp.logo.remove")
  .input(RemoveLogoSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchServiceProviderStep, { id: input.id });
    if (!current.logo) {
      return current;
    }
    const storageKey = current.logo;

    await ctx.step.run("remove-storage", async () => {
      await removeLogoObject(storageKey).catch(() => undefined);
    });

    await ctx.step.run("clear-reference", async () => {
      const [updated] = await ctx.db
        .update(serviceProvider)
        .set({ logo: null, updated_at: new Date() })
        .where(eq(serviceProvider.id, input.id))
        .returning();
      if (!updated) {
        throw new Error(`Service Provider with id "${input.id}" not found.`);
      }
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SP_LOGO_REMOVED,
        crudAction: "update",
        entityId: input.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
      });
      await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.UPDATED, {
        changes: { logo: null },
        serviceProvider: { id: input.id, name: current.name },
      });
    });

    return ctx.step.run(fetchServiceProviderStep, { id: input.id });
  });
