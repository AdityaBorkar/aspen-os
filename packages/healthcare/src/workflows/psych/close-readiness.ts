import { healthcareSafetyPlan } from "#/db-schemas/psych";
import { CloseReadinessSchema } from "#/schemas/psych";
import { fetchLatestRiskStep } from "#/workflow-steps/fetch-risk-flag";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CloseReadinessInputSchema = object({ input: CloseReadinessSchema });

export const closeReadiness = Workflow.name("healthcare.psych.closeReadiness")
  .input(CloseReadinessInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CloseReadinessSchema, input);
    const branchId = parsed.branchId ?? "main";

    const risk = await ctx.step.run(fetchLatestRiskStep, {
      branchId,
      patientId: parsed.patientId,
    });
    if (!risk || risk.level === "Low") {
      return { blockers: [], encounterId: parsed.encounterId, ok: true };
    }

    const [plan, alerted] = await ctx.step.run("check-close-clearance", async () => {
      const [found] = await ctx.db
        .select({ id: healthcareSafetyPlan.id })
        .from(healthcareSafetyPlan)
        .where(
          and(
            eq(healthcareSafetyPlan.patient_id, parsed.patientId),
            eq(healthcareSafetyPlan.branch_id, branchId),
            eq(healthcareSafetyPlan.encounter_id, parsed.encounterId),
          ),
        )
        .limit(1);
      const { alerts } = risk.payload;
      return [found ?? null, Array.isArray(alerts) && alerts.length > 0] as const;
    });

    const blockers: string[] = [];
    if (!plan) {
      blockers.push(`${risk.level} risk on this encounter needs a saved safety plan before close`);
    }
    if (!alerted) {
      blockers.push(
        `${risk.level} risk on this encounter needs a senior clinician alert before close`,
      );
    }
    return { blockers, encounterId: parsed.encounterId, ok: blockers.length === 0 };
  });
