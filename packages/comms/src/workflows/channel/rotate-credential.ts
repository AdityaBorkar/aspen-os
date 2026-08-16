import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { RotateChannelCredentialSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RotateInputSchema = object({ input: RotateChannelCredentialSchema });

export function rotateChannelCredential(kvStore: KvStoreUnit) {
  return Workflow.name("comms.channel.rotate-credential")
    .input(RotateInputSchema)
    .handler(async ({ input }, ctx) => {
      const parsed = parse(RotateChannelCredentialSchema, input);
      const current = await ctx.step.run(fetchChannelStep, { id: parsed.id });

      if (current.source !== "tenant") {
        throw new Error(`Host channels do not carry tenant credentials and cannot be rotated.`);
      }

      const newRef = `comms:channel:${crypto.randomUUID()}:credential`;
      await ctx.step.run("store-credential", () => kvStore.set(newRef, parsed.credential, 0));
      const oldRef = current.credentialRef;
      if (oldRef) {
        await ctx.step.run("delete-old-credential", () => kvStore.del(oldRef));
      }

      const [updated] = await ctx.db
        .update(commsChannel)
        .set({ credentialRef: newRef, updatedAt: new Date() })
        .where(eq(commsChannel.id, parsed.id))
        .returning();

      if (!updated) {
        throw new Error(`Channel with id "${parsed.id}" not found.`);
      }

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.CREDENTIAL_ROTATED,
          entityId: updated.id,
          entityType: AUDIT_ENTITY_TYPE.CHANNEL,
        });

        await ctx.pubsub.publish(CHANNEL_EVENTS.CREDENTIAL_ROTATED, {
          channelId: updated.id,
        });
      });

      return updated;
    });
}
