import { healthcareRehabGoal } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { CreateRehabGoalPlanSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SetGoalsInputSchema = object({ input: CreateRehabGoalPlanSchema });

export const setGoals = Workflow.name("healthcare.rehab.setGoals")
  .input(SetGoalsInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRehabGoalPlanSchema, input);
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

    const rows = await ctx.step.run("insert-rehab-goals", async () =>
      ctx.db
        .insert(healthcareRehabGoal)
        .values(
          parsed.goals.map((goal) => ({
            branch_id: branchId,
            created_by: actorId,
            episode_id: parsed.episodeId,
            goal: goal.goal,
            patient_id: parsed.patientId,
            status: goal.status,
            target_date: goal.targetDate ?? null,
          })),
        )
        .returning(),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: parsed.episodeId,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: {
          episodeId: parsed.episodeId,
          goalCount: rows.length,
          patientId: parsed.patientId,
        },
      });
      await ctx.pubsub.publish(REHAB_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: parsed.episodeId,
      });
    });

    return {
      branchId,
      episodeId: parsed.episodeId,
      goals: rows.map((row) => ({
        goal: row.goal,
        id: row.id,
        status: row.status,
        targetDate: row.target_date,
      })),
      patientId: parsed.patientId,
    };
  });
