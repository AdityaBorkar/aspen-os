import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { UpdateChannelSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ input: UpdateChannelSchema });

export const updateChannel = Workflow.name("comms.channel.update")
  .input(UpdateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdateChannelSchema, input);
    const current = await ctx.step.run(fetchChannelStep, { id: parsed.id });

    const changes: Record<string, JsonValue> = {};
    if (parsed.name !== undefined && parsed.name !== current.name) {
      changes.name = parsed.name;
    }
    if (parsed.senderAddress !== undefined && parsed.senderAddress !== current.senderAddress) {
      changes.senderAddress = parsed.senderAddress;
    }
    if (
      parsed.metadata !== undefined &&
      JSON.stringify(parsed.metadata) !== JSON.stringify(current.metadata)
    ) {
      changes.metadata = parsed.metadata;
    }

    const [updated] = await ctx.db
      .update(commsChannel)
      .set({
        metadata: parsed.metadata ?? current.metadata,
        name: parsed.name ?? current.name,
        senderAddress: parsed.senderAddress ?? current.senderAddress,
        updatedAt: new Date(),
      })
      .where(eq(commsChannel.id, parsed.id))
      .returning();

    if (!updated) {
      throw new Error(`Channel with id "${parsed.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CHANNEL,
      });

      await ctx.pubsub.publish(CHANNEL_EVENTS.UPDATED, {
        changes,
        channelId: updated.id,
      });
    });

    return updated;
  });
