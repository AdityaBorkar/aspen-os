import { healthcareAdvance } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { SettleAdvanceSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SettleAdvanceInputSchema = object({ input: SettleAdvanceSchema });

export const settleAdvance = Workflow.name("healthcare.billing.settle-advance")
  .input(SettleAdvanceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SettleAdvanceSchema, input);
    const branchId = parsed.branchId ?? "main";
    const balance = parsed.direction === "receive" ? parsed.amount : -parsed.amount;
    const [row] = await ctx.step.run("insert-advance", async () =>
      ctx.db
        .insert(healthcareAdvance)
        .values({
          amount: String(parsed.amount),
          balance: String(balance),
          branch_id: branchId,
          direction: parsed.direction,
          patient_id: parsed.patientId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to settle advance.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.COLLECTED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { balance: row.balance, direction: row.direction, patientId: row.patient_id },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.COLLECTED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { advanceId: row.id, patientId: row.patient_id };
  });
