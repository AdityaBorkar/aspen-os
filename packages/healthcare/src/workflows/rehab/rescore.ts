import { healthcareOutcomeScore, healthcareRehabAssessment } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { CreateOutcomeScoreSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";
import { scoreBand } from "#/workflow-steps/rehab-band";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RescoreInputSchema = object({ input: CreateOutcomeScoreSchema });

export const rescore = Workflow.name("healthcare.rehab.rescore")
  .input(RescoreInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateOutcomeScoreSchema, input);
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
    const latest = await ctx.step.run("fetch-latest-assessment", async () => {
      const [found] = await ctx.db
        .select()
        .from(healthcareRehabAssessment)
        .where(
          and(
            eq(healthcareRehabAssessment.episode_id, parsed.episodeId),
            eq(healthcareRehabAssessment.tool, parsed.tool),
          ),
        )
        .orderBy(desc(healthcareRehabAssessment.created_at))
        .limit(1);
      return found ?? null;
    });
    const band = scoreBand(
      parsed.score,
      latest && latest.max_score !== null ? Number(latest.max_score) : null,
    );
    const [row] = await ctx.step.run("insert-outcome-score", async () =>
      ctx.db
        .insert(healthcareOutcomeScore)
        .values({
          band,
          branch_id: branchId,
          created_by: actorId,
          episode_id: parsed.episodeId,
          patient_id: parsed.patientId,
          score: String(parsed.score),
          tool: parsed.tool,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the outcome score.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: {
          band,
          episodeId: row.episode_id,
          id: row.id,
          patientId: row.patient_id,
          tool: row.tool,
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
      band,
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      episodeId: row.episode_id,
      id: row.id,
      patientId: row.patient_id,
      score: Number(row.score),
      tool: row.tool,
    };
  });
