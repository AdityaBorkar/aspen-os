import { commsMessage } from "#/db-schemas";
import { MESSAGE_EVENTS } from "#/pubsub";
import { RetryMessageSchema } from "#/schemas/message";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchMessageStep } from "#/workflow-steps/fetch-message";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const RetryInputSchema = object({ input: RetryMessageSchema });

export const retryMessage = Workflow.name("comms.message.retry")
  .input(RetryInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchMessageStep, { id: input.id });

    if (current.status !== "failed") {
      throw new Error(
        `Only failed messages can be retried (message "${input.id}" is ${current.status}).`,
      );
    }

    const now = new Date();
    const [updated] = await ctx.db
      .update(commsMessage)
      .set({
        attempts: 0,
        last_error: null,
        queued_at: now,
        status: "queued",
      })
      .where(eq(commsMessage.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Message with id "${input.id}" not found.`);
    }

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.RETRIED,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.MESSAGE,
      event: {
        payload: { channel_type: updated.channel_type, messageId: updated.id, to: updated.to },
        topic: MESSAGE_EVENTS.QUEUED,
      },
    });

    return updated;
  });
