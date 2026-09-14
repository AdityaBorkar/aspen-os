import { healthcareMedicalRegister } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { AppendRegisterSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RegistersAppendInputSchema = object({ input: AppendRegisterSchema });

export const registersAppend = Workflow.name("healthcare.records.registers-append")
  .input(RegistersAppendInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AppendRegisterSchema, input);
    const branchId = parsed.branchId ?? "main";
    const serial = await ctx.step.run(nextHealthcareSeries, {
      input: { series: `register_${parsed.register}` },
    });
    const [row] = await ctx.step.run("insert-entry", async () =>
      ctx.db
        .insert(healthcareMedicalRegister)
        .values({
          branch_id: branchId,
          details: parsed.details,
          entered_by: parsed.enteredBy,
          register: parsed.register,
          serial,
          status: "live",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to append register entry.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { register: row.register, serial: row.serial },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, register: row.register, serial: row.serial, status: row.status };
  });
