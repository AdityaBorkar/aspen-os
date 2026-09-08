import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { ActivateChannelSchema } from "#/schemas/channel";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const ActivateInputSchema = object({ input: ActivateChannelSchema });

export const activateChannel = Workflow.name("comms.channel.activate")
  .input(ActivateInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchChannelStep, { id: input.id });

    if (current.status === "active") {
      return current;
    }

    if (!current.verified_at) {
      throw new Error(
        `Channel "${input.id}" must be verified (channels.test) before it can be activated.`,
      );
    }

    const [updated] = await ctx.db
      .update(commsChannel)
      .set({ status: "active", updated_at: new Date() })
      .where(eq(commsChannel.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Channel with id "${input.id}" not found.`);
    }

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.ACTIVATED,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.CHANNEL,
      event: {
        payload: { channelId: updated.id, from: current.status, to: "active" },
        topic: CHANNEL_EVENTS.STATUS_CHANGED,
      },
    });

    return updated;
  });
