import { commsProvider } from "#/db-schemas";
import { PROVIDER_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas/utils";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchProviderStep } from "#/workflow-steps/fetch-provider";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const ActivateInputSchema = object({ input: object({ id: IdSchema }) });

export const activateProvider = Workflow.name("comms.provider.activate")
  .input(ActivateInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchProviderStep, { id: input.id });
    if (current.isActive) {
      return current;
    }

    const [updated] = await ctx.db
      .update(commsProvider)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(commsProvider.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Provider with id "${input.id}" not found.`);
    }

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.ACTIVATED,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.PROVIDER,
      event: {
        payload: { isActive: true, providerId: updated.id },
        topic: PROVIDER_EVENTS.STATUS_CHANGED,
      },
    });

    return updated;
  });
