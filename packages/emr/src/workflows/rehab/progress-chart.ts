import { healthcareOutcomeScore, healthcareRehabAssessment } from "#/db-schemas/rehab";
import { ProgressChartSchema } from "#/schemas/rehab";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ProgressChartInputSchema = object({ input: ProgressChartSchema });

export const progressChart = Workflow.name("emr.rehab.progressChart")
  .input(ProgressChartInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ProgressChartSchema, input);

    const episode = await ctx.step.run(fetchRehabEpisodeStep, {
      id: parsed.episodeId,
    });

    const [assessments, scores] = await ctx.step.run("load-scores", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareRehabAssessment)
          .where(eq(healthcareRehabAssessment.episode_id, parsed.episodeId))
          .orderBy(asc(healthcareRehabAssessment.created_at))
          .limit(500),
        ctx.db
          .select()
          .from(healthcareOutcomeScore)
          .where(
            parsed.tool
              ? and(
                  eq(healthcareOutcomeScore.episode_id, parsed.episodeId),
                  eq(healthcareOutcomeScore.tool, parsed.tool),
                )
              : eq(healthcareOutcomeScore.episode_id, parsed.episodeId),
          )
          .orderBy(asc(healthcareOutcomeScore.created_at))
          .limit(500),
      ]),
    );

    const tools = [
      ...new Set([...assessments.map((row) => row.tool), ...scores.map((row) => row.tool)]),
    ]
      .filter((tool) => !parsed.tool || tool === parsed.tool)
      .toSorted();
    const series = tools.map((tool) => {
      const preRows = assessments.filter((row) => row.tool === tool);
      const postRows = scores.filter((row) => row.tool === tool);
      const pre = preRows.length > 0 ? Number(preRows[0]?.score ?? 0) : null;
      const post = postRows.length > 0 ? Number(postRows[postRows.length - 1]?.score ?? 0) : pre;
      return {
        gain: pre === null || post === null ? null : post - pre,
        points: [...preRows, ...postRows].map((row) => ({
          at: row.created_at.toISOString(),
          band: row.band,
          kind: "max_score" in row ? "assessment" : "rescore",
          score: Number(row.score),
        })),
        post,
        pre,
        tool,
      };
    });

    return {
      episodeId: episode.id,
      patientId: episode.patient_id,
      series,
    };
  });
