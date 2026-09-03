import { automationRule } from "#/db-schemas/automation-rule";
import { AutomationTriggerSchema } from "#/schemas/enums";

import { JsonValueSchema, Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { array, object, optional, record, safeParse, string } from "valibot";

export interface AutomationContext {
  projectId: string;
  taskId: string;
  trigger: string;
  values: Record<string, JsonValue>;
}

export interface AutomationAction {
  field?: string;
  type: string;
  value?: JsonValue;
}

const AutomationActionSchema = object({
  field: optional(string()),
  type: string(),
  value: optional(JsonValueSchema),
});

const AutomationActionArraySchema = array(AutomationActionSchema);

const ConditionMapSchema = record(string(), JsonValueSchema);

export const evaluateAutomationRules = Workflow.name("automation.evaluate")
  .input(
    object({
      context: object({
        projectId: string(),
        taskId: string(),
        trigger: string(),
        values: record(string(), JsonValueSchema),
      }),
    }),
  )
  .handler(async ({ context }, ctx) => {
    const parsedTrigger = safeParse(AutomationTriggerSchema, context.trigger);
    if (!parsedTrigger.success) {
      return [];
    }
    const trigger = parsedTrigger.output;

    const rules = await ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(automationRule)
        .where(
          and(
            eq(automationRule.projectId, context.projectId),
            eq(automationRule.trigger, trigger),
            eq(automationRule.isActive, true),
          ),
        ),
    );

    const matchingActions: AutomationAction[] = [];

    for (const rule of rules) {
      const parsedConditions = safeParse(ConditionMapSchema, rule.conditions);
      const conditionsMatch = parsedConditions.success
        ? matchesConditions(parsedConditions.output, context.values)
        : false;
      if (conditionsMatch) {
        const parsedActions = safeParse(AutomationActionArraySchema, rule.actions);
        if (parsedActions.success) {
          matchingActions.push(...parsedActions.output);
        }
      }
    }

    return matchingActions;
  });

function matchesConditions(
  conditions: Record<string, JsonValue>,
  values: Record<string, JsonValue>,
): boolean {
  for (const [key, expected] of Object.entries(conditions)) {
    if (values[key] !== expected) {
      return false;
    }
  }
  return true;
}
