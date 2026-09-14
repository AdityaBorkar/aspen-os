import { healthcareMessageLog, healthcareMessageOptout } from "#/db-schemas/records";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { SendMessageSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const MessagingSendInputSchema = object({ input: SendMessageSchema });

export const messagingSend = Workflow.name("healthcare.operations.messaging-send")
  .input(MessagingSendInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SendMessageSchema, input);
    const branchId = parsed.branchId ?? "main";
    const channel = parsed.channel ?? "sms";
    const blocked = await ctx.step.run("check-optout", async () =>
      ctx.db
        .select({ id: healthcareMessageOptout.id })
        .from(healthcareMessageOptout)
        .where(
          and(
            eq(healthcareMessageOptout.branch_id, branchId),
            eq(healthcareMessageOptout.to, parsed.to),
          ),
        )
        .limit(10),
    );
    if (blocked.length > 0) {
      throw new Error("Recipient has opted out; messaging is blocked for this recipient");
    }
    const [row] = await ctx.step.run("queue-message", async () =>
      ctx.db
        .insert(healthcareMessageLog)
        .values({
          branch_id: branchId,
          channel,
          patient_id: parsed.patientId ?? null,
          status: "queued",
          template: parsed.template,
          to: parsed.to,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to queue message.");
    }
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
