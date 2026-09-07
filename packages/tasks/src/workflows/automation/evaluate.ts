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
      // Unknown triggers match no rules; evaluation succeeds with zero actions.
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
      // A rule with unparseable stored conditions/actions is skipped so one
      // corrupt rule cannot break evaluation of the remaining rules.
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
    if (stableStringify(values[key]) !== stableStringify(expected)) {
      return false;
    }
  }
  return true;
}

function stableStringify(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (value instanceof Object) {
    // SAFETY: instanceof Object excludes null here, so value is a JSON object
    // whose entries are JSON values by the JsonValue contract.
    const fields = value as Record<string, JsonValue>;
    const entries = Object.entries(fields)
      .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
