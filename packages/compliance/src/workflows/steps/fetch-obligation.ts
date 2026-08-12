import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceObligation } from "../../db-schemas";

export const fetchObligationStep = WorkflowStep.name(
  "fetch-obligation",
).handler(async (input: { id: string }, ctx) => {
  const [result] = await ctx.db
    .select()
    .from(complianceObligation)
    .where(eq(complianceObligation.id, input.id))
    .limit(1);

  if (!result) {
    throw new Error(`Compliance obligation with id "${input.id}" not found.`);
  }

  return result;
});
