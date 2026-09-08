import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { SetDefaultChannelSchema } from "#/schemas/channel";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

const SetDefaultInputSchema = object({ input: SetDefaultChannelSchema });

export const setDefaultChannel = Workflow.name("comms.channel.set-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ input }, ctx) => {
    const channel = await ctx.step.run(fetchChannelStep, { id: input.id });

    if (channel.status !== "active") {
      throw new Error(`Channel "${input.id}" must be active before it can be made the default.`);
    }
    if (!channel.verified_at) {
      throw new Error(
        `Channel "${input.id}" must be verified (channels.test) before it can be made the default.`,
      );
    }

    // Both writes happen in one step so concurrent set-default calls cannot
    // interleave into zero- or two-default states.
    const updated = await ctx.step.run("set-default", async () => {
      await ctx.db
        .update(commsChannel)
        .set({ is_default: false })
        .where(
          and(
            eq(commsChannel.entity_id, channel.entity_id),
            eq(commsChannel.entity_type, channel.entity_type),
            eq(commsChannel.type, channel.type),
            eq(commsChannel.is_default, true),
          ),
        );

      const [row] = await ctx.db
        .update(commsChannel)
        .set({ is_default: true, updated_at: new Date() })
        .where(eq(commsChannel.id, input.id))
        .returning();

      if (!row) {
        throw new Error(`Channel with id "${input.id}" not found.`);
      }
      return row;
    });

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.DEFAULT_SET,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.CHANNEL,
      event: {
        payload: { channelId: updated.id, isDefault: true, type: updated.type },
        topic: CHANNEL_EVENTS.DEFAULT_CHANGED,
      },
    });

    return updated;
  });
