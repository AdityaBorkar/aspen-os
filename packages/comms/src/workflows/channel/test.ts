import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { createAdapter, providerKindForChannel } from "#/services/adapters/index";
import { resolveChannelCredential } from "#/services/credential-service";
import { TestChannelSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import { CHANNEL_SOURCE } from "@aspen-os/constants";
import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const TestInputSchema = object({ input: TestChannelSchema });

export function testChannel(kvStore: KvStoreUnit) {
  return Workflow.name("comms.channel.test")
    .input(TestInputSchema)
    .handler(async ({ input }, ctx) => {
      const parsed = parse(TestChannelSchema, input);
      const channel = await ctx.step.run(fetchChannelStep, { id: parsed.id });

      if (channel.source === CHANNEL_SOURCE.HOST) {
        throw new Error(
          "Host channels are provisioned by the system and are already verified; run channels.test on a tenant (BYOC) channel.",
        );
      }

      const credential = await resolveChannelCredential(channel, kvStore);
      const kind = providerKindForChannel(channel.type, credential);
      const adapter = createAdapter(channel.type);
      const testedAt = new Date();

      try {
        const verify = adapter.test;
        await (verify
          ? verify({
              channel,
              credential,
              kind,
              recipientAddress: parsed.recipientAddress,
            })
          : adapter.send({
              channel,
              credential,
              kind,
              message: {
                body: "This is a verification message from your communication channel configuration.",
                subject: "Comms channel verification",
                to: parsed.recipientAddress ?? "",
              },
            }));

        const [row] = await ctx.db
          .update(commsChannel)
          .set({ lastTestedAt: testedAt, updatedAt: testedAt, verifiedAt: testedAt })
          .where(eq(commsChannel.id, parsed.id))
          .returning();

        if (!row) {
          throw new Error(`Channel with id "${parsed.id}" not found.`);
        }

        await ctx.step.run("audit-and-notify", async () => {
          await ctx.audit.write({
            action: AUDIT_ACTION.TESTED,
            crudAction: "update",
            entityId: row.id,
            entityType: AUDIT_ENTITY_TYPE.CHANNEL,
            newState: { ok: true },
          });

          await ctx.pubsub.publish(CHANNEL_EVENTS.TESTED, {
            at: testedAt.toISOString(),
            channelId: row.id,
            ok: true,
          });
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
          .where(eq(commsChannel.id, parsed.id));

        await ctx.pubsub.publish(CHANNEL_EVENTS.TESTED, {
          at: testedAt.toISOString(),
          channelId: parsed.id,
          ok: false,
        });

        throw error;
      }
    });
}
