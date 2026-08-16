import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { DeactivateChannelSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DeactivateInputSchema = object({ input: DeactivateChannelSchema });

export const deactivateChannel = Workflow.name("comms.channel.deactivate")
  .input(DeactivateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DeactivateChannelSchema, input);
    const current = await ctx.step.run(fetchChannelStep, { id: parsed.id });

    if (current.status === "inactive") {
      return current;
    }

    const [updated] = await ctx.db
      .update(commsChannel)
      .set({ isDefault: false, status: "inactive", updatedAt: new Date() })
      .where(eq(commsChannel.id, parsed.id))
      .returning();

    if (!updated) {
      throw new Error(`Channel with id "${parsed.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DEACTIVATED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CHANNEL,
      });

      await ctx.pubsub.publish(CHANNEL_EVENTS.STATUS_CHANGED, {
        channelId: updated.id,
        from: current.status,
        to: "inactive",
      });
    });

    return updated;
  });
