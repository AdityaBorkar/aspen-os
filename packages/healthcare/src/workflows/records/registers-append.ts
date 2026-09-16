import { healthcareMedicalRegister } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { AppendRegisterSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import type { JsonValue } from "@aspen-os/platform/server";
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
    const registerPayload: Record<string, JsonValue> = {};
    if (parsed.encounterId) {
      registerPayload.encounterId = parsed.encounterId;
    }
    if (parsed.occurredAt) {
      registerPayload.occurredAt = parsed.occurredAt;
    }
    if (parsed.certifierId) {
      registerPayload.certifierId = parsed.certifierId;
    }
    const [row] = await ctx.step.run("insert-entry", async () =>
      ctx.db
        .insert(healthcareMedicalRegister)
        .values({
          branch_id: branchId,
          details: parsed.details,
          entered_by: parsed.enteredBy,
          payload: registerPayload,
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
      // Registers keep gapless number-preserving voids in healthcare; the
      // verification aspect lives in compliance.verification and the document
      // aspect in compliance.document. This event carries the clinical ids for
      // the compliance bridge.
      await ctx.pubsub.publish(RECORDS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        data: {
          complianceOwner: "compliance.verification",
          register: row.register,
          serial: row.serial,
        },
        id: row.id,
      });
    });
    return {
      certifierId: parsed.certifierId ?? null,
      encounterId: parsed.encounterId ?? null,
      id: row.id,
      occurredAt: parsed.occurredAt ?? null,
      register: row.register,
      serial: row.serial,
      status: row.status,
    };
  });
