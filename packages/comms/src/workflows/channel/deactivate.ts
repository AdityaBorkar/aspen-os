import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { DeactivateChannelSchema } from "#/schemas/channel";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeactivateInputSchema = object({ input: DeactivateChannelSchema });

export const deactivateChannel = Workflow.name("comms.channel.deactivate")
  .input(DeactivateInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchChannelStep, { id: input.id });

    if (current.status === "inactive") {
      return current;
    }

    const [updated] = await ctx.db
      .update(commsChannel)
      .set({ isDefault: false, status: "inactive", updatedAt: new Date() })
      .where(eq(commsChannel.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Channel with id "${input.id}" not found.`);
    }

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.DEACTIVATED,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.CHANNEL,
      event: {
        payload: { channelId: updated.id, from: current.status, to: "inactive" },
        topic: CHANNEL_EVENTS.STATUS_CHANGED,
      },
    });

    return updated;
  });
