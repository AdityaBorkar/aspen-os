import { healthcareRiskFlag } from "#/db-schemas/psych";

import { WorkflowStep } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, string } from "valibot";

const FetchLatestRiskInputSchema = object({
  branchId: string(),
  patientId: string(),
});

export const fetchLatestRiskStep = WorkflowStep.name("healthcare-fetch-latest-risk")
  .input(FetchLatestRiskInputSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcareRiskFlag)
      .where(
        and(
          eq(healthcareRiskFlag.patient_id, input.patientId),
          eq(healthcareRiskFlag.branch_id, input.branchId),
        ),
      )
      .orderBy(desc(healthcareRiskFlag.created_at))
      .limit(1);
    return row ?? null;
  });
