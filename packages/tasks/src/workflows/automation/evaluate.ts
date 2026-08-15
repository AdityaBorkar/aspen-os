import { automationRule } from "#/db-schemas/automation-rule";
import { isAutomationTrigger } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { array, custom, object, optional, record, safeParse, string, unknown } from "valibot";

export interface AutomationContext {
  taskId: string;
  trigger: string;
  values: Record<string, JsonValue>;
}

export interface AutomationAction {
  field?: string;
  type: string;
  value?: unknown;
}

const JsonValueSchema = custom<JsonValue>(() => true);

const AutomationActionSchema = object({
  field: optional(string()),
  type: string(),
  value: optional(unknown()),
});

const AutomationActionArraySchema = array(AutomationActionSchema);

const ConditionMapSchema = record(string(), JsonValueSchema);

export const evaluateAutomationRules = Workflow.name("automation.evaluate")
  .input(
    object({
      context: object({
        taskId: string(),
        trigger: string(),
        values: record(string(), JsonValueSchema),
      }),
    }),
  )
  .handler(async ({ context }, ctx) => {
    const { trigger } = context;
    if (!isAutomationTrigger(trigger)) {
      return [];
    }

    const rules = await ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(automationRule)
        .where(
          and(
            eq(automationRule.projectId, context.taskId),
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
        : true;
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
