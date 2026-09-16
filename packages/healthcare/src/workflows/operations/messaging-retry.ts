import { healthcareMessageLog } from "#/db-schemas/records";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { RetryMessageSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertRecipientOptedIn } from "#/workflows/shared/messaging";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const MessagingRetryInputSchema = object({ input: RetryMessageSchema });

export const messagingRetry = Workflow.name("healthcare.operations.messaging-retry")
  .input(MessagingRetryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RetryMessageSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [msg] = await ctx.step.run("load-message", async () =>
      ctx.db
        .select()
        .from(healthcareMessageLog)
        .where(eq(healthcareMessageLog.id, parsed.messageId))
        .limit(1),
    );
    if (!msg) {
      throw new Error("Message not found; verify the message id and retry");
    }
    if (msg.status === "delivered") {
      throw new Error("Message already delivered; retry applies to queued/failed messages only");
    }
    await ctx.step.run("check-optout", async () => {
      await assertRecipientOptedIn(ctx.db, branchId, msg.to);
    });
    const [row] = await ctx.step.run("requeue-message", async () =>
      ctx.db
        .update(healthcareMessageLog)
        .set({
          payload: { ...msg.payload, retriedAt: new Date().toISOString() },
          status: "queued",
          updated_at: new Date(),
        })
        .where(eq(healthcareMessageLog.id, msg.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to requeue message.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { status: row.status },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { messageId: row.id, status: row.status };
  });
