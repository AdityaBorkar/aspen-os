import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceVerificationRule } from "../../db-schemas";

export const fetchRuleStep = WorkflowStep.name("fetch-rule").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(complianceVerificationRule)
      .where(eq(complianceVerificationRule.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Verification rule with id "${input.id}" not found.`);
    }

    return result;
  },
);
