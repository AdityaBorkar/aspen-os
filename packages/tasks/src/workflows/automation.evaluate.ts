import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, record, string, unknown } from "valibot";

import { automationRule } from "../db-schemas/automation-rule";
import type { AutomationTrigger } from "../utils/constants";

export interface AutomationContext {
  taskId: string;
  trigger: string;
  values: Record<string, unknown>;
}

export interface AutomationAction {
  field?: string;
  type: string;
  value?: unknown;
}

export const evaluateAutomationRules = Workflow.name("automation.evaluate")
  .input(
    object({
      context: object({
        taskId: string(),
        trigger: string(),
        values: record(string(), unknown()),
      }),
    }),
  )
  .handler(async ({ context }, ctx) => {
    const rules = await ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(automationRule)
        .where(
          and(
            eq(automationRule.projectId, context.taskId),
            eq(automationRule.trigger, context.trigger as AutomationTrigger),
            eq(automationRule.isActive, true),
          ),
        ),
    );

    const matchingActions: AutomationAction[] = [];

    for (const rule of rules) {
      if (matchesConditions(rule.conditions, context.values)) {
        const actions = rule.actions as AutomationAction[];
        if (Array.isArray(actions)) {
          matchingActions.push(...actions);
        }
      }
    }

    return matchingActions;
  });

function matchesConditions(conditions: unknown, values: Record<string, unknown>): boolean {
  if (!conditions || typeof conditions !== "object") {
    return true;
  }

  const conds = conditions as Record<string, unknown>;
  for (const [key, expected] of Object.entries(conds)) {
    if (values[key] !== expected) {
      return false;
    }
  }

  return true;
}
