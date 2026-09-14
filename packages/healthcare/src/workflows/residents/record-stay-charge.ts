import { healthcareStayCharge } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { CreateStayChargeSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RecordStayChargeInputSchema = object({ input: CreateStayChargeSchema });

export const recordStayCharge = Workflow.name("healthcare.residents.record-stay-charge")
  .input(RecordStayChargeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateStayChargeSchema, input);
    const branchId = parsed.branchId ?? "main";
    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
    const [row] = await ctx.step.run("insert-charge", async () =>
      ctx.db
        .insert(healthcareStayCharge)
        .values({
          amount: String(parsed.amount),
          branch_id: branchId,
          charge_date: parsed.chargeDate,
          kind: parsed.kind ?? "stay",
          resident_id: resident.id,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record stay charge.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { amount: row.amount, chargeDate: row.charge_date, residentId: row.resident_id },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      amount: Number(row.amount),
      chargeDate: row.charge_date,
      id: row.id,
      residentId: row.resident_id,
    };
  });
