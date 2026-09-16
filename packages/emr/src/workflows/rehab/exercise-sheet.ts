import { healthcareExerciseSheet } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { CreateExercisePrescriptionSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ExerciseSheetInputSchema = object({
  input: CreateExercisePrescriptionSchema,
});

export const exerciseSheet = Workflow.name("emr.rehab.exerciseSheet")
  .input(ExerciseSheetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateExercisePrescriptionSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const episode = await ctx.step.run(fetchRehabEpisodeStep, {
      id: parsed.episodeId,
    });
    if (episode.status !== "Active") {
      throw new Error("Rehab episode is discharged; open a new episode for further care");
    }
    if (episode.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the rehab episode; check the selected patient");
    }

    const [row] = await ctx.step.run("insert-exercise-sheet", async () =>
      ctx.db
        .insert(healthcareExerciseSheet)
        .values({
          branch_id: branchId,
          created_by: actorId,
          episode_id: parsed.episodeId,
          exercises: parsed.exercises,
          patient_id: parsed.patientId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to prescribe the exercise sheet.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: {
          episodeId: row.episode_id,
          exerciseCount: row.exercises.length,
          id: row.id,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(REHAB_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      episodeId: row.episode_id,
      exercises: row.exercises,
      id: row.id,
      patientId: row.patient_id,
    };
  });
