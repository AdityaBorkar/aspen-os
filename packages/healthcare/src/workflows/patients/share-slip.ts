import { healthcareShareSlip } from "#/db-schemas/patient";
import { PATIENT_EVENTS } from "#/pubsub";
import { PatientIdSchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPatientStep } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ShareSlipInputSchema = object({ input: PatientIdSchema });

export const shareSlip = Workflow.name("healthcare.patients.share-slip")
  .input(ShareSlipInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PatientIdSchema, input);
    const patient = await ctx.step.run(fetchPatientStep, { id: parsed.id });

    // Log-only: records the share text for audit traceability; no external send.
    const text = `${patient.full_name} | ${patient.uhid} | ${patient.phone}`;

    const [row] = await ctx.step.run("insert-slip", async () =>
      ctx.db
        .insert(healthcareShareSlip)
        .values({ branch_id: patient.branch_id, patient_id: patient.id, text })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create share slip.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        metadata: { kind: "share-slip", patientId: patient.id },
        newState: { id: row.id, patientId: patient.id },
      });
      await ctx.pubsub.publish(PATIENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: patient.branch_id,
        id: patient.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      patientId: row.patient_id,
      text: row.text,
    };
  });
