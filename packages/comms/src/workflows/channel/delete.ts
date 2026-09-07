import { commsChannel, commsMessage } from "#/db-schemas";
import { DeleteChannelSchema } from "#/schemas/channel";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { object } from "valibot";

const DeleteInputSchema = object({ input: DeleteChannelSchema });

export function deleteChannel(kvStore: KvStoreUnit) {
  return Workflow.name("comms.channel.delete")
    .input(DeleteInputSchema)
    .handler(async ({ input }, ctx) => {
      const current = await ctx.step.run(fetchChannelStep, { id: input.id });

      const inFlight = await ctx.db
        .select({ id: commsMessage.id })
        .from(commsMessage)
        .where(
          and(
            eq(commsMessage.channelId, input.id),
            inArray(commsMessage.status, ["queued", "sending"]),
          ),
        )
        .limit(1);

      if (inFlight.length > 0) {
        throw new Error(
          `Channel "${input.id}" cannot be deleted while delivery messages are in flight.`,
        );
      }

      await ctx.db
        .update(commsMessage)
        .set({ channelId: null })
        .where(eq(commsMessage.channelId, input.id));

      await ctx.db.delete(commsChannel).where(eq(commsChannel.id, input.id));

      if (current.source === "tenant") {
        const { credentialRef } = current;
        if (credentialRef) {
          await ctx.step.run("delete-credential", () => kvStore.del(credentialRef));
        }
      }

      await auditAndPublish(ctx, {
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.CHANNEL,
        metadata: { name: current.name, type: current.type },
      });

      return { removed: true };
    });
}
