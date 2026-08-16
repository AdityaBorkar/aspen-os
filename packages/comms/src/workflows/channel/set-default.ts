import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { SetDefaultChannelSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SetDefaultInputSchema = object({ input: SetDefaultChannelSchema });

export const setDefaultChannel = Workflow.name("comms.channel.set-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetDefaultChannelSchema, input);
    const channel = await ctx.step.run(fetchChannelStep, { id: parsed.id });

    if (channel.status !== "active") {
      throw new Error(`Channel "${parsed.id}" must be active before it can be made the default.`);
    }
    if (!channel.verifiedAt) {
      throw new Error(
        `Channel "${parsed.id}" must be verified (channels.test) before it can be made the default.`,
      );
    }

    await ctx.db
      .update(commsChannel)
      .set({ isDefault: false })
      .where(
        and(
          eq(commsChannel.entityId, channel.entityId),
          eq(commsChannel.entityType, channel.entityType),
          eq(commsChannel.type, channel.type),
          eq(commsChannel.isDefault, true),
        ),
      );

    const [updated] = await ctx.db
      .update(commsChannel)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(commsChannel.id, parsed.id))
      .returning();

    if (!updated) {
      throw new Error(`Channel with id "${parsed.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DEFAULT_SET,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CHANNEL,
      });

      await ctx.pubsub.publish(CHANNEL_EVENTS.DEFAULT_CHANGED, {
        channelId: updated.id,
        isDefault: true,
        type: updated.type,
      });
    });

    return updated;
  });
