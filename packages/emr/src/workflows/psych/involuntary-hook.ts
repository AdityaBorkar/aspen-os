import { healthcarePsychAssessment, healthcareRiskFlag } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateInvoluntaryHookSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InvoluntaryHookInputSchema = object({
  input: CreateInvoluntaryHookSchema,
});

export const involuntaryHook = Workflow.name("emr.psych.involuntaryHook")
  .input(InvoluntaryHookInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateInvoluntaryHookSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (parsed.encounterId) {
      const encounter = await ctx.step.run(fetchEncounterStep, {
        id: parsed.encounterId,
      });
      if (encounter.patient_id !== parsed.patientId) {
        throw new Error("Patient does not match the parent encounter; check the selected patient");
      }
    }

    // No certificate is issued here; the hook only records the legal
    // reference against the latest assessment for escalation review.
    const assessment = await ctx.step.run("fetch-latest-assessment", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcarePsychAssessment)
        .where(
          and(
            eq(healthcarePsychAssessment.patient_id, parsed.patientId),
            eq(healthcarePsychAssessment.branch_id, branchId),
          ),
        )
        .orderBy(desc(healthcarePsychAssessment.created_at))
        .limit(1);
      if (!row) {
        throw new Error(
          "Psych assessment not found; assess the patient before recording an involuntary hook",
        );
      }
      return row;
    });

    const nowIso = new Date().toISOString();
    const hook = {
      actorId,
      at: nowIso,
      authority: parsed.authority ?? null,
      legalRef: parsed.legalRef,
      reason: parsed.reason,
      reviewDate: parsed.reviewDate ?? null,
    } satisfies Record<string, JsonValue>;
    const prior = assessment.payload.involuntaryHooks;
    const hooks = [...(Array.isArray(prior) ? prior : []), hook];

    const [row] = await ctx.step.run("append-involuntary-hook", async () =>
      ctx.db
        .update(healthcarePsychAssessment)
        .set({ payload: { ...assessment.payload, involuntaryHooks: hooks } })
        .where(eq(healthcarePsychAssessment.id, assessment.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the involuntary hook.");
    }

    // Flag the legal hook on the latest risk screen when one exists.
    const [risk] = await ctx.step.run("fetch-latest-risk", async () =>
      ctx.db
        .select()
        .from(healthcareRiskFlag)
        .where(
          and(
            eq(healthcareRiskFlag.patient_id, parsed.patientId),
            eq(healthcareRiskFlag.branch_id, branchId),
          ),
        )
        .orderBy(desc(healthcareRiskFlag.created_at))
        .limit(1),
    );
    if (risk) {
      const riskId = risk.id;
      const riskPayload = risk.payload;
      await ctx.step.run("mark-risk-involuntary", async () => {
        await ctx.db
          .update(healthcareRiskFlag)
          .set({ payload: { ...riskPayload, involuntaryHook: hook } })
          .where(eq(healthcareRiskFlag.id, riskId));
      });
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ESCALATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          assessmentId: row.id,
          id: row.id,
          legalRef: parsed.legalRef,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(PSYCH_EVENTS.UPDATED, {
        actorId,
        at: nowIso,
        branchId,
        id: row.id,
      });
    });

    return {
      assessmentId: row.id,
      authority: parsed.authority ?? null,
      id: row.id,
      legalRef: parsed.legalRef,
      patientId: row.patient_id,
      reason: parsed.reason,
      reviewDate: parsed.reviewDate ?? null,
    };
  });
