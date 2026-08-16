import { commsProvider } from "#/db-schemas";
import { PROVIDER_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchProviderStep } from "#/workflow-steps/fetch-provider";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeactivateInputSchema = object({ input: object({ id: IdSchema }) });

export const deactivateProvider = Workflow.name("comms.provider.deactivate")
  .input(DeactivateInputSchema)
  .handler(async ({ input }, ctx) => {
    await ctx.step.run(fetchProviderStep, { id: input.id });

    const [updated] = await ctx.db
      .update(commsProvider)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(commsProvider.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Provider with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DEACTIVATED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.PROVIDER,
      });

      await ctx.pubsub.publish(PROVIDER_EVENTS.STATUS_CHANGED, {
        isActive: false,
        providerId: updated.id,
      });
    });

    return updated;
  });
