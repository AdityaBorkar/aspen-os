import { commsMessage } from "#/db-schemas";
import { MESSAGE_EVENTS } from "#/pubsub";
import { RetryMessageSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchMessageStep } from "#/workflow-steps/fetch-message";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RetryInputSchema = object({ input: RetryMessageSchema });

export const retryMessage = Workflow.name("comms.message.retry")
  .input(RetryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RetryMessageSchema, input);
    const current = await ctx.step.run(fetchMessageStep, { id: parsed.id });

    if (current.status !== "failed") {
      throw new Error(
        `Only failed messages can be retried (message "${parsed.id}" is ${current.status}).`,
      );
    }

    const now = new Date();
    const [updated] = await ctx.db
      .update(commsMessage)
      .set({
        attempts: 0,
        lastError: null,
        queuedAt: now,
        status: "queued",
      })
      .where(eq(commsMessage.id, parsed.id))
      .returning();

    if (!updated) {
      throw new Error(`Message with id "${parsed.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.RETRIED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.MESSAGE,
      });

      await ctx.pubsub.publish(MESSAGE_EVENTS.QUEUED, {
        channelType: updated.channelType,
        messageId: updated.id,
        to: updated.to,
      });
    });

    return updated;
  });
