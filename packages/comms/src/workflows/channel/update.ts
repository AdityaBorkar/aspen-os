import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { UpdateChannelSchema } from "#/schemas/channel";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { metadataEqual } from "#/utils/metadata";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({ input: UpdateChannelSchema });

export const updateChannel = Workflow.name("comms.channel.update")
  .input(UpdateInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchChannelStep, { id: input.id });

    const changes: Record<string, JsonValue> = {};
    if (input.name !== undefined && input.name !== current.name) {
      changes.name = input.name;
    }
    if (input.senderAddress !== undefined && input.senderAddress !== current.senderAddress) {
      changes.senderAddress = input.senderAddress;
    }
    if (input.metadata !== undefined && !metadataEqual(input.metadata, current.metadata)) {
      changes.metadata = input.metadata ?? null;
    }

    if (Object.keys(changes).length === 0) {
      return current;
    }

    const [updated] = await ctx.db
      .update(commsChannel)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(commsChannel.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Channel with id "${input.id}" not found.`);
    }

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.UPDATED,
      changes,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.CHANNEL,
      event: {
        payload: { changes, channelId: updated.id },
        topic: CHANNEL_EVENTS.UPDATED,
      },
    });

    return updated;
  });
