import { automationRule } from "#/db-schemas/automation-rule";
import { IdSchema } from "#/types";
import { requireRow } from "#/workflows/utils";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchAutomationRuleStep = WorkflowStep.name("fetch-automation-rule")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const rows = await ctx.db
      .select()
      .from(automationRule)
      .where(eq(automationRule.id, input.id))
      .limit(1);

    return requireRow(rows, "Automation rule", input.id);
  });
