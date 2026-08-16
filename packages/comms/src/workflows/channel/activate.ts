import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { ActivateChannelSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ActivateInputSchema = object({ input: ActivateChannelSchema });

export const activateChannel = Workflow.name("comms.channel.activate")
  .input(ActivateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ActivateChannelSchema, input);
    const current = await ctx.step.run(fetchChannelStep, { id: parsed.id });

    if (current.status === "active") {
      return current;
    }

    if (!current.verifiedAt) {
      throw new Error(
        `Channel "${parsed.id}" must be verified (channels.test) before it can be activated.`,
      );
    }

    const [updated] = await ctx.db
      .update(commsChannel)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(commsChannel.id, parsed.id))
      .returning();

    if (!updated) {
      throw new Error(`Channel with id "${parsed.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ACTIVATED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CHANNEL,
      });

      await ctx.pubsub.publish(CHANNEL_EVENTS.STATUS_CHANGED, {
        channelId: updated.id,
        from: current.status,
        to: "active",
      });
    });

    return updated;
  });
