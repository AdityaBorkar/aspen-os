import { healthcareScaleResult } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateScaleResultSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ScoreScaleInputSchema = object({ input: CreateScaleResultSchema });

function scaleBand(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct < 1 / 3) {
    return "mild";
  }
  if (pct < 2 / 3) {
    return "moderate";
  }
  return "severe";
}

export const scoreScale = Workflow.name("healthcare.psych.scoreScale")
  .input(ScoreScaleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateScaleResultSchema, input);
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

    // Re-administration guard: same scale within 24h needs an override reason.
    const recent = await ctx.step.run("check-recent-scale", async () => {
      const rows = await ctx.db
        .select()
        .from(healthcareScaleResult)
        .where(
          and(
            eq(healthcareScaleResult.patient_id, parsed.patientId),
            eq(healthcareScaleResult.branch_id, branchId),
            eq(healthcareScaleResult.scale, parsed.scale),
          ),
        )
        .orderBy(desc(healthcareScaleResult.created_at))
        .limit(5);
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return rows.find((row) => row.created_at.getTime() > cutoff) ?? null;
    });
    if (recent && !parsed.override) {
      throw new Error(
        "Scale was administered within the last 24 hours; add an override with a reason to re-administer",
      );
    }
    if (parsed.override && !parsed.overrideReason) {
      throw new Error("Override needs a reason; record why the scale is repeated");
    }

    const band = scaleBand(parsed.score, parsed.maxScore);
    const [row] = await ctx.step.run("insert-scale-result", async () =>
      ctx.db
        .insert(healthcareScaleResult)
        .values({
          assessment_id: parsed.assessmentId ?? null,
          band,
          branch_id: branchId,
          created_by: actorId,
          encounter_id: parsed.encounterId,
          max_score: String(parsed.maxScore),
          override: parsed.override ?? false,
          override_reason: parsed.overrideReason ?? null,
          patient_id: parsed.patientId,
          scale: parsed.scale,
          score: String(parsed.score),
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the scale result.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: parsed.override ? AUDIT_ACTION.OVERRIDE : AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          band,
          id: row.id,
          override: row.override,
          patientId: row.patient_id,
          scale: row.scale,
        },
      });
      await ctx.pubsub.publish(PSYCH_EVENTS.CREATED, {
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
      encounterId: row.encounter_id,
      id: row.id,
      maxScore: Number(row.max_score),
      patientId: row.patient_id,
      scale: row.scale,
      score: Number(row.score),
    };
  });
