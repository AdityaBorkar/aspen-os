import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { automationRule } from "../../db-schemas/automation-rule";
import { IdSchema } from "../../types";

export const fetchAutomationRuleStep = WorkflowStep.name("fetch-automation-rule")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(automationRule)
      .where(eq(automationRule.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Automation rule with id "${input.id}" not found.`);
    }

    return result;
  });
