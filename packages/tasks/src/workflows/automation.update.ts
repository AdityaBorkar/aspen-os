import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { automationRule } from "../db-schemas/automation-rule";
import { IdSchema, UpdateAutomationRuleSchema } from "../types";
import { fetchAutomationRuleStep } from "./steps/fetch-automation-rule";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateAutomationRuleSchema,
});

export const updateAutomationRule = Workflow.name("automation.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    await ctx.step.run(fetchAutomationRuleStep, { id });

    const [updated] = await ctx.db
      .update(automationRule)
      .set({
        actions: patch.actions,
        conditions: patch.conditions,
        isActive: patch.isActive,
        name: patch.name,
        trigger: patch.trigger,
        updatedAt: new Date(),
      })
      .where(eq(automationRule.id, id))
      .returning();

    return updated;
  });
