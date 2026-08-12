import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { automationRule } from "../db-schemas/automation-rule";
import { CreateAutomationRuleSchema } from "../types";

const CreateInputSchema = object({
  input: CreateAutomationRuleSchema,
});

export const createAutomationRule = Workflow.name("automation.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(automationRule)
      .values({
        actions: input.actions,
        conditions: input.conditions ?? null,
        isActive: input.isActive ?? true,
        name: input.name,
        projectId: input.projectId,
        trigger: input.trigger,
      })
      .returning();

    return result;
  });
