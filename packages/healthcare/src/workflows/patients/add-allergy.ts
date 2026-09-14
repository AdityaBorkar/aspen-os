import { healthcareAllergy } from "#/db-schemas/patient";
import { PATIENT_EVENTS } from "#/pubsub";
import { CreateAllergySchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPatientStep } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AddAllergyInputSchema = object({ input: CreateAllergySchema });

export const addAllergy = Workflow.name("healthcare.patients.add-allergy")
  .input(AddAllergyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAllergySchema, input);
    const branchId = parsed.branchId ?? "main";

    const patient = await ctx.step.run(fetchPatientStep, { id: parsed.patientId });

    const [row] = await ctx.step.run("insert-allergy", async () =>
      ctx.db
        .insert(healthcareAllergy)
        .values({
          branch_id: branchId,
          name: parsed.name,
          note: parsed.note ?? null,
          patient_id: patient.id,
          payload: parsed.reaction ? { reaction: parsed.reaction } : {},
          severity: parsed.severity,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record allergy.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        metadata: { kind: "allergy", patientId: patient.id },
        newState: { id: row.id, name: parsed.name, severity: parsed.severity },
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
      name: row.name,
      note: row.note,
      patientId: row.patient_id,
      reaction:
        typeof row.payload?.reaction === "string"
          ? row.payload.reaction
          : (parsed.reaction ?? null),
      severity: row.severity,
    };
  });
