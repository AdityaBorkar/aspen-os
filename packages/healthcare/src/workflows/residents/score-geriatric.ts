import { healthcareGeriatricScore } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { CreateGeriatricScoreSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ScoreGeriatricInputSchema = object({ input: CreateGeriatricScoreSchema });

function bandFor(kind: string, score: number): string {
  if (kind === "Morse") {
    return score >= 45 ? "high" : score >= 25 ? "moderate" : "low";
  }
  if (kind === "Braden") {
    return score <= 12 ? "high" : score <= 14 ? "moderate" : "low";
  }
  if (kind === "MNA") {
    return score < 17 ? "high" : score <= 23.5 ? "moderate" : "low";
  }
  if (kind === "MMSE") {
    return score < 18 ? "high" : score <= 23 ? "moderate" : "low";
  }
  return score <= 2 ? "high" : score <= 4 ? "moderate" : "low";
}

export const scoreGeriatric = Workflow.name("healthcare.residents.score-geriatric")
  .input(ScoreGeriatricInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateGeriatricScoreSchema, input);
    const branchId = parsed.branchId ?? "main";
    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
    const band = bandFor(parsed.kind, parsed.score);
    const [row] = await ctx.step.run("insert-score", async () =>
      ctx.db
        .insert(healthcareGeriatricScore)
        .values({
          assessed_by: parsed.assessedBy,
          band,
          branch_id: branchId,
          kind: parsed.kind,
          note: parsed.note ?? null,
          resident_id: resident.id,
          score: String(parsed.score),
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record geriatric score.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { band: row.band, kind: row.kind, score: row.score },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      band: row.band,
      id: row.id,
      kind: row.kind,
      residentId: row.resident_id,
      score: Number(row.score),
    };
  });
