import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { RotateChannelCredentialSchema } from "#/schemas/channel";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const RotateInputSchema = object({ input: RotateChannelCredentialSchema });

export function rotateChannelCredential(kvStore: KvStoreUnit) {
  return Workflow.name("comms.channel.rotate-credential")
    .input(RotateInputSchema)
    .handler(async ({ input }, ctx) => {
      const current = await ctx.step.run(fetchChannelStep, { id: input.id });

      if (current.source !== "tenant") {
        throw new Error("Host channels do not carry tenant credentials and cannot be rotated.");
      }

      const newRef = `comms:channel:${crypto.randomUUID()}:credential`;
      await ctx.step.run("store-credential", () => kvStore.set(newRef, input.credential, 0));
      const oldRef = current.credential_ref;
      if (oldRef) {
        await ctx.step.run("delete-old-credential", () => kvStore.del(oldRef));
      }

      const [updated] = await ctx.db
        .update(commsChannel)
        .set({ credential_ref: newRef, updated_at: new Date() })
        .where(eq(commsChannel.id, input.id))
        .returning();

      if (!updated) {
        throw new Error(`Channel with id "${input.id}" not found.`);
      }

      await auditAndPublish(ctx, {
        action: AUDIT_ACTION.CREDENTIAL_ROTATED,
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CHANNEL,
        event: {
          payload: { channelId: updated.id },
          topic: CHANNEL_EVENTS.CREDENTIAL_ROTATED,
        },
      });

      return updated;
    });
}
