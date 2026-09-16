import { healthcareRehabAssessment } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { CreateRehabAssessmentSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";
import { scoreBand } from "#/workflow-steps/rehab-band";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AssessInputSchema = object({ input: CreateRehabAssessmentSchema });

// Scale-specific totals for severity interpretation when the caller omits maxScore.
function defaultMax(tool: string): number | null {
  switch (tool) {
    case "Barthel": {
      return 100;
    }
    case "Berg": {
      return 56;
    }
    case "FIM": {
      return 126;
    }
    case "VAS": {
      return 10;
    }
    default: {
      return null;
    }
  }
}

const MMT_GRADE = /^[0-5][+-]?$/;

export const assess = Workflow.name("emr.rehab.assess")
  .input(AssessInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRehabAssessmentSchema, input);
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

    // GUSS high-risk (<=9/20) forces an NPO flag for swallow safety.
    const npoFlag = parsed.tool === "GUSS" && parsed.score <= 9;
    // Scale-specific totals: per-item entries must add up to the reported
    // score, and well-known scales default their max when omitted.
    const toolMax = parsed.maxScore ?? defaultMax(parsed.tool);
    if (parsed.items && parsed.items.length > 0) {
      const itemTotal = parsed.items.reduce((sum, item) => sum + item.score, 0);
      if (Math.abs(itemTotal - parsed.score) > 0.001) {
        throw new Error(
          `Item scores total ${itemTotal} but the reported score is ${parsed.score}; fix the entries and retry`,
        );
      }
    }
    if (parsed.tool === "MMT" && parsed.mmtGrade && !MMT_GRADE.test(parsed.mmtGrade)) {
      throw new Error("MMT grade must be 0-5 with optional +/- (for example 3+); fix it and retry");
    }
    const band = scoreBand(parsed.score, toolMax);
    const structured = {
      items: parsed.items ?? null,
      mmtGrade: parsed.mmtGrade ?? null,
      romDegrees: parsed.romDegrees ?? null,
      romType: parsed.romType ?? null,
    } satisfies Record<string, JsonValue>;

    const [row] = await ctx.step.run("insert-rehab-assessment", async () =>
      ctx.db
        .insert(healthcareRehabAssessment)
        .values({
          band,
          branch_id: branchId,
          created_by: actorId,
          details: parsed.details ?? null,
          episode_id: parsed.episodeId,
          max_score: toolMax === null ? null : String(toolMax),
          npo_flag: npoFlag,
          patient_id: parsed.patientId,
          payload: { structured },
          score: String(parsed.score),
          status: parsed.status,
          tool: parsed.tool,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the rehab assessment.");
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
          npoFlag,
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
      maxScore: row.max_score === null ? null : Number(row.max_score),
      npoFlag,
      npoMessage: npoFlag
        ? "GUSS high-risk: keep the patient NPO and escalate for swallow review"
        : null,
      patientId: row.patient_id,
      score: Number(row.score),
      status: row.status,
      tool: row.tool,
    };
  });
