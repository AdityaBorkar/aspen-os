import { healthcareRecall } from "#/db-schemas/patient";
import { PATIENT_EVENTS } from "#/pubsub";
import { EnrolRecallSchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPatientStep } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const EnrolRecallInputSchema = object({ input: EnrolRecallSchema });

export const enrolRecall = Workflow.name("healthcare.patients.enrol-recall")
  .input(EnrolRecallInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(EnrolRecallSchema, input);
    const branchId = parsed.branchId ?? "main";

    const patient = await ctx.step.run(fetchPatientStep, { id: parsed.patientId });

    const [row] = await ctx.step.run("insert-recall", async () =>
      ctx.db
        .insert(healthcareRecall)
        .values({
          at: parsed.at,
          branch_id: branchId,
          patient_id: patient.id,
          reason: parsed.reason,
          status: "open",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to enrol recall.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        metadata: { kind: "recall", patientId: patient.id },
        newState: { at: parsed.at, id: row.id, reason: parsed.reason },
      });
      await ctx.pubsub.publish(PATIENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        data: {
          patientId: patient.id,
          reason: row.reason,
          recallAt: row.at,
          recallId: row.id,
        },
        id: patient.id,
      });
    });

    return {
      at: row.at,
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      patientId: row.patient_id,
      reason: row.reason,
      status: row.status,
    };
  });
