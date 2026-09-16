import { healthcareRiskFlag } from "#/db-schemas/psych";
import { RecallListFiltersSchema } from "#/schemas/psych";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RecallListInputSchema = object({ input: RecallListFiltersSchema });

export const recallList = Workflow.name("emr.psych.recallList")
  .input(RecallListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecallListFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";

    const rows = await ctx.step.run("list-risk-flags", async () => {
      const conditions = [eq(healthcareRiskFlag.branch_id, branchId)];
      if (parsed.riskLevel) {
        conditions.push(eq(healthcareRiskFlag.level, parsed.riskLevel));
      }
      return ctx.db
        .select()
        .from(healthcareRiskFlag)
        .where(and(...conditions))
        .orderBy(desc(healthcareRiskFlag.created_at))
        .limit(parsed.limit ?? 50);
    });

    const now = Date.now();
    return rows
      .map((row) => ({
        branchId: row.branch_id,
        createdAt: row.created_at.toISOString(),
        daysOverdue: Math.max(0, Math.floor((now - row.created_at.getTime()) / 86_400_000)),
        encounterId: row.encounter_id,
        factors: row.factors,
        id: row.id,
        level: row.level,
        patientId: row.patient_id,
      }))
      .filter((row) => row.daysOverdue >= (parsed.minDaysOverdue ?? 0));
  });
