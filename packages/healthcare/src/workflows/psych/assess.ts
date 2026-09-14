import { healthcarePsychAssessment } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreatePsychAssessmentSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AssessInputSchema = object({ input: CreatePsychAssessmentSchema });

export const assess = Workflow.name("healthcare.psych.assess")
  .input(AssessInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePsychAssessmentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const encounter = await ctx.step.run(fetchEncounterStep, {
      id: parsed.encounterId,
    });
    if (encounter.status !== "open") {
      throw new Error("Encounter is signed and immutable; file an addendum instead of editing");
    }
    if (encounter.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the parent encounter; check the selected patient");
    }

    const [row] = await ctx.step.run("insert-psych-assessment", async () =>
      ctx.db
        .insert(healthcarePsychAssessment)
        .values({
          branch_id: branchId,
          chief_complaint: parsed.chiefComplaint,
          created_by: actorId,
          encounter_id: parsed.encounterId,
          history: parsed.history,
          impression: parsed.impression,
          masked: true,
          mental_status_exam: parsed.mentalStatusExam,
          patient_id: parsed.patientId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the psych assessment.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          encounterId: row.encounter_id,
          id: row.id,
          masked: true,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(PSYCH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    // Masked: clinical content never leaves the write path.
    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      encounterId: row.encounter_id,
      id: row.id,
      masked: true,
      patientId: row.patient_id,
    };
  });
