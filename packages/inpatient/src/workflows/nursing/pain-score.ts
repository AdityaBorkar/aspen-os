import { healthcarePainScore } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordPainSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PainScoreInputSchema = object({ input: RecordPainSchema });

export const painScore = Workflow.name("inpatient.nursing.pain-score")
  .input(PainScoreInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordPainSchema, input);
    const branchId = parsed.branchId ?? "main";
    if (parsed.phase === "post") {
      const [pre] = await ctx.step.run("load-pre-score", async () =>
        ctx.db
          .select({ id: healthcarePainScore.id })
          .from(healthcarePainScore)
          .where(
            and(
              eq(healthcarePainScore.branch_id, branchId),
              eq(healthcarePainScore.patient_id, parsed.patientId),
              eq(healthcarePainScore.phase, "pre"),
            ),
          )
          .orderBy(desc(healthcarePainScore.created_at))
          .limit(1),
      );
      if (!pre) {
        throw new Error("Post pain score needs a pre score; record the pre score first");
      }
    }
    const [row] = await ctx.step.run("insert-pain", async () =>
      ctx.db
        .insert(healthcarePainScore)
        .values({
          branch_id: branchId,
          note: parsed.note ?? null,
          patient_id: parsed.patientId,
          phase: parsed.phase,
          score: parsed.score,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record pain score.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { patientId: row.patient_id, phase: row.phase, score: row.score },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      escalate: row.score >= 7,
      id: row.id,
      patientId: row.patient_id,
      phase: row.phase,
      reassessmentDue: row.phase === "pre",
      reassessmentPrompt:
        row.phase === "pre" ? "Reassess pain post-intervention and record a post score" : null,
      score: row.score,
    };
  });
