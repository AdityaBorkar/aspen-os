import { healthcareFlag } from "#/db-schemas/patient";
import { PATIENT_EVENTS } from "#/pubsub";
import { CreateFlagSchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPatientStep } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SetFlagInputSchema = object({ input: CreateFlagSchema });

export const setPatientFlag = Workflow.name("healthcare.patients.set-flag")
  .input(SetFlagInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFlagSchema, input);
    const branchId = parsed.branchId ?? "main";

    const patient = await ctx.step.run(fetchPatientStep, { id: parsed.patientId });

    const [row] = await ctx.step.run("insert-flag", async () =>
      ctx.db
        .insert(healthcareFlag)
        .values({
          branch_id: branchId,
          label: parsed.label,
          level: parsed.level,
          patient_id: patient.id,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to set patient flag.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        metadata: { kind: "flag", patientId: patient.id },
        newState: { id: row.id, label: parsed.label, level: parsed.level },
      });
      await ctx.pubsub.publish(PATIENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: patient.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      label: row.label,
      level: row.level,
      patientId: row.patient_id,
    };
  });
