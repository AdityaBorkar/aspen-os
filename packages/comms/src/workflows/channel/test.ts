import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { TestChannelSchema } from "#/schemas/channel";
import { createAdapter } from "#/services/adapters/index";
import { providerKindForChannel } from "#/services/adapters/shared";
import { resolveChannelCredential } from "#/services/credential-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import { CHANNEL_SOURCE, CHANNEL_TYPE } from "@aspen-os/constants";
import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const TestInputSchema = object({ input: TestChannelSchema });

export function testChannel(kvStore: KvStoreUnit) {
  return Workflow.name("comms.channel.test")
    .input(TestInputSchema)
    .handler(async ({ input }, ctx) => {
      const channel = await ctx.step.run(fetchChannelStep, { id: input.id });

      if (channel.source === CHANNEL_SOURCE.HOST) {
        throw new Error(
          "Host channels are provisioned by the system and are already verified; run channels.test on a tenant (BYOC) channel.",
        );
      }
      if (channel.type === CHANNEL_TYPE.PUSH || channel.type === CHANNEL_TYPE.OTHER) {
        throw new Error(
          `Channel type "${channel.type}" has no delivery adapter; test is not supported.`,
        );
      }
      if (!input.recipientAddress) {
        throw new Error("recipientAddress is required to verify a channel.");
      }

      const credential = await resolveChannelCredential(channel, kvStore);
      const kind = providerKindForChannel(channel.type, credential);
      const adapter = createAdapter(channel.type);
      if (!adapter.test) {
        throw new Error(
          `Channel type "${channel.type}" does not implement a test verification path.`,
        );
      }
      const testedAt = new Date();

      try {
        await adapter.test({
          channel,
          credential,
          kind,
          recipientAddress: input.recipientAddress,
        });

        const [row] = await ctx.db
          .update(commsChannel)
          .set({ lastTestedAt: testedAt, updatedAt: testedAt, verifiedAt: testedAt })
          .where(eq(commsChannel.id, input.id))
          .returning();

        if (!row) {
          throw new Error(`Channel with id "${input.id}" not found.`);
        }

        await auditAndPublish(ctx, {
          action: AUDIT_ACTION.TESTED,
          crudAction: "update",
          entityId: row.id,
          entityType: AUDIT_ENTITY_TYPE.CHANNEL,
          event: {
            payload: { at: testedAt.toISOString(), channelId: row.id, ok: true },
            topic: CHANNEL_EVENTS.TESTED,
          },
          newState: { ok: true },
        });

        return row;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ctx.db
          .update(commsChannel)
          .set({
            lastTestedAt: testedAt,
            metadata: { ...channel.metadata, lastTestError: message },
            updatedAt: testedAt,
          })
          .where(eq(commsChannel.id, input.id));

        await ctx.pubsub.publish(CHANNEL_EVENTS.TESTED, {
          at: testedAt.toISOString(),
          channelId: input.id,
          ok: false,
        });

        throw error;
      }
    });
}
