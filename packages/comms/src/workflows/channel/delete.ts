import { commsChannel, commsMessage } from "#/db-schemas";
import { DeleteChannelSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { object, parse } from "valibot";

const DeleteInputSchema = object({ input: DeleteChannelSchema });

export function deleteChannel(kvStore: KvStoreUnit) {
  return Workflow.name("comms.channel.delete")
    .input(DeleteInputSchema)
    .handler(async ({ input }, ctx) => {
      const parsed = parse(DeleteChannelSchema, input);
      const current = await ctx.step.run(fetchChannelStep, { id: parsed.id });

      const inFlight = await ctx.db
        .select({ id: commsMessage.id })
        .from(commsMessage)
        .where(
          and(
            eq(commsMessage.channelId, parsed.id),
            inArray(commsMessage.status, ["queued", "sending"]),
          ),
        )
        .limit(1);

      if (inFlight.length > 0) {
        throw new Error(
          `Channel "${parsed.id}" cannot be deleted while delivery messages are in flight.`,
        );
      }

      await ctx.db
        .update(commsMessage)
        .set({ channelId: null })
        .where(eq(commsMessage.channelId, parsed.id));

      await ctx.db.delete(commsChannel).where(eq(commsChannel.id, parsed.id));

      if (current.source === "tenant") {
        const { credentialRef } = current;
        if (credentialRef) {
          await ctx.step.run("delete-credential", () => kvStore.del(credentialRef));
        }
      }

      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.CHANNEL,
        metadata: { name: current.name, type: current.type },
      });

      return { removed: true };
    });
}
