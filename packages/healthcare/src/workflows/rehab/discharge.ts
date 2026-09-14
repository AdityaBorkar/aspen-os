import {
  healthcareOutcomeScore,
  healthcareRehabAssessment,
  healthcareRehabDischarge,
  healthcareRehabEpisode,
} from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { CreateDischargeSummarySchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DischargeInputSchema = object({ input: CreateDischargeSummarySchema });

export const discharge = Workflow.name("healthcare.rehab.discharge")
  .input(DischargeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDischargeSummarySchema, input);
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

    const coverage = await ctx.step.run("check-pre-post-coverage", async () => {
      const [pre] = await ctx.db
        .select({ id: healthcareRehabAssessment.id })
        .from(healthcareRehabAssessment)
        .where(eq(healthcareRehabAssessment.episode_id, parsed.episodeId))
        .limit(1);
      const [post] = await ctx.db
        .select({ id: healthcareOutcomeScore.id })
        .from(healthcareOutcomeScore)
        .where(
          and(
            eq(healthcareOutcomeScore.episode_id, parsed.episodeId),
            eq(healthcareOutcomeScore.patient_id, parsed.patientId),
          ),
        )
        .limit(1);
      return { post: post ?? null, pre: pre ?? null };
    });
    if (!coverage.pre || !coverage.post) {
      throw new Error(
        "Discharge needs both a pre assessment and a post outcome score; record them first",
      );
    }

    const [row] = await ctx.step.run("insert-rehab-discharge", async () =>
      ctx.db
        .insert(healthcareRehabDischarge)
        .values({
          branch_id: branchId,
          created_by: actorId,
          episode_id: parsed.episodeId,
          outcome: parsed.outcome,
          patient_id: parsed.patientId,
          summary: parsed.summary,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the rehab discharge.");
    }

    await ctx.step.run("close-rehab-episode", async () => {
      await ctx.db
        .update(healthcareRehabEpisode)
        .set({ status: "Discharged" })
        .where(eq(healthcareRehabEpisode.id, parsed.episodeId));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: {
          episodeId: row.episode_id,
          id: row.id,
          outcome: row.outcome,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(REHAB_EVENTS.UPDATED, {
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
      id: row.id,
      outcome: row.outcome,
      patientId: row.patient_id,
      summary: row.summary,
    };
  });
