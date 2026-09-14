import { healthcareClinicalDocument, healthcareDischargeSummary } from "#/db-schemas/records";
import { FamilySummaryMultiSchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const FamilySummaryMultiInputSchema = object({ input: FamilySummaryMultiSchema });

export const familySummaryMulti = Workflow.name("healthcare.records.family-summary-multi")
  .input(FamilySummaryMultiInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FamilySummaryMultiSchema, input);
    const branchId = parsed.branchId ?? "main";

    const summaries = await ctx.step.run("load-summaries", async () =>
      Promise.all(
        parsed.patientIds.map(async (patientId) => {
          const [docs, discharges] = await Promise.all([
            ctx.db
              .select()
              .from(healthcareClinicalDocument)
              .where(
                and(
                  eq(healthcareClinicalDocument.branch_id, branchId),
                  eq(healthcareClinicalDocument.patient_id, patientId),
                ),
              )
              .limit(50),
            ctx.db
              .select()
              .from(healthcareDischargeSummary)
              .where(eq(healthcareDischargeSummary.branch_id, branchId))
              .limit(50),
          ]);
          const psych = docs.some((row) => row.file_type.toLowerCase().includes("psych"));
          return {
            discharges: discharges.length,
            documents: docs.length,
            masked: psych,
            patientId,
          };
        }),
      ),
    );

    return { count: summaries.length, summaries };
  });
