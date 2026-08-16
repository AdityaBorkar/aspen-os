import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { CreateChannelSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateChannelSchema });

export function createChannel(kvStore: KvStoreUnit) {
  return Workflow.name("comms.channel.create")
    .input(CreateInputSchema)
    .handler(async ({ input }, ctx) => {
      const parsed = parse(CreateChannelSchema, input);

      const credentialRef = `comms:channel:${crypto.randomUUID()}:credential`;
      await ctx.step.run("store-credential", () =>
        kvStore.set(credentialRef, parsed.credential, 0),
      );

      const [row] = await ctx.db
        .insert(commsChannel)
        .values({
          credentialRef,
          entityId: parsed.entityId,
          entityType: parsed.entityType,
          metadata: parsed.metadata ?? null,
          name: parsed.name,
          senderAddress: parsed.senderAddress,
          source: "tenant",
          status: "inactive",
          type: parsed.type,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create channel.");
      }

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.CREATED,
          crudAction: "create",
          entityId: row.id,
          entityType: AUDIT_ENTITY_TYPE.CHANNEL,
          newState: {
            entityId: row.entityId,
            entityType: row.entityType,
            name: row.name,
            senderAddress: row.senderAddress,
            status: row.status,
            type: row.type,
          },
        });

        await ctx.pubsub.publish(CHANNEL_EVENTS.CREATED, {
          channel: {
            id: row.id,
            name: row.name,
            source: row.source,
            status: row.status,
            type: row.type,
          },
        });
      });

      return row;
    });
}
