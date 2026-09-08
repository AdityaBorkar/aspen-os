import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { CreateChannelSchema } from "#/schemas/channel";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateChannelSchema });

export function createChannel(kvStore: KvStoreUnit) {
  return Workflow.name("comms.channel.create")
    .input(CreateInputSchema)
    .handler(async ({ input }, ctx) => {
      const credentialRef = `comms:channel:${crypto.randomUUID()}:credential`;
      await ctx.step.run("store-credential", () => kvStore.set(credentialRef, input.credential, 0));

      const [row] = await ctx.db
        .insert(commsChannel)
        .values({
          credential_ref: credentialRef,
          entity_id: input.entityId,
          entity_type: input.entityType,
          metadata: input.metadata ?? null,
          name: input.name,
          sender_address: input.senderAddress,
          source: "tenant",
          status: "inactive",
          type: input.type,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create channel.");
      }

      await auditAndPublish(ctx, {
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.CHANNEL,
        event: {
          payload: {
            channel: {
              id: row.id,
              name: row.name,
              source: row.source,
              status: row.status,
              type: row.type,
            },
          },
          topic: CHANNEL_EVENTS.CREATED,
        },
        newState: {
          entityId: row.entity_id,
          entityType: row.entity_type,
          name: row.name,
          senderAddress: row.sender_address,
          status: row.status,
          type: row.type,
        },
      });

      return row;
    });
}
