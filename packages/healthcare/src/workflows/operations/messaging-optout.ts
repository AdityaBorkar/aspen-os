import { healthcareMessageOptout } from "#/db-schemas/records";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { OptOutMessageSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const MessagingOptOutInputSchema = object({ input: OptOutMessageSchema });

export const messagingOptOut = Workflow.name("healthcare.operations.messaging-optout")
  .input(MessagingOptOutInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(OptOutMessageSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-optout", async () =>
      ctx.db
        .insert(healthcareMessageOptout)
        .values({
          branch_id: branchId,
          channel: parsed.channel ?? "sms",
          to: parsed.to,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record opt-out.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { channel: row.channel, to: row.to },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { messageId: row.id, to: row.to };
  });
