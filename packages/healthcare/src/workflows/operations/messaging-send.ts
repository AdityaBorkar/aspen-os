import { OPERATIONS_EVENTS } from "#/pubsub";
import { SendMessageSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertRecipientOptedIn, queueOutboundMessage } from "#/workflows/shared/messaging";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const MessagingSendInputSchema = object({ input: SendMessageSchema });

export const messagingSend = Workflow.name("healthcare.operations.messaging-send")
  .input(MessagingSendInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SendMessageSchema, input);
    const branchId = parsed.branchId ?? "main";
    const channel = parsed.channel ?? "sms";
    await ctx.step.run("check-optout", async () => {
      await assertRecipientOptedIn(ctx.db, branchId, parsed.to);
    });
    const row = await ctx.step.run("queue-message", async () =>
      queueOutboundMessage(ctx.db, {
        branchId,
        channel,
        patientId: parsed.patientId ?? null,
        template: parsed.template,
        to: parsed.to,
      }),
    );
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { channel: row.channel, status: row.status, to: row.to },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { channel: row.channel, id: row.id, status: row.status };
  });
