import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { parse } from "valibot";

import { automationRule } from "../db-schema";
import type { UpdateAutomationRuleInput } from "../types";
import {
  CreateAutomationRuleSchema,
  UpdateAutomationRuleSchema,
} from "../types";

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

const fetchAutomationRuleStep = WorkflowStep.name(
  "fetch-automation-rule",
).handler(async (input: { id: string }, ctx) => {
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

const createAutomationRule = Workflow.name("automation.create")
  .input(CreateAutomationRuleSchema)
  .handler(async (parsed, ctx) => {
    const [result] = await ctx.db
      .insert(automationRule)
      .values({
        actions: parsed.actions,
        conditions: parsed.conditions ?? null,
        isActive: parsed.isActive ?? true,
        name: parsed.name,
        projectId: parsed.projectId,
        trigger: parsed.trigger,
      })
      .returning();

    return result;
  });

const updateAutomationRule = Workflow.name("automation.update").handler(
  async (input: { id: string; patch: UpdateAutomationRuleInput }, ctx) => {
    await ctx.step.run(fetchAutomationRuleStep, { id: input.id });
    const parsed = parse(UpdateAutomationRuleSchema, input.patch);

    const [updated] = await ctx.db
      .update(automationRule)
      .set({
        actions: parsed.actions,
        conditions: parsed.conditions,
        isActive: parsed.isActive,
        name: parsed.name,
        trigger: parsed.trigger,
        updatedAt: new Date(),
      })
      .where(eq(automationRule.id, input.id))
      .returning();

    return updated;
  },
);

const deleteAutomationRule = Workflow.name("automation.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db.delete(automationRule).where(eq(automationRule.id, input.id));
  },
);

const getAutomationRuleById = Workflow.name("automation.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchAutomationRuleStep, { id: input.id });
  },
);

const listAutomationRulesByProject = Workflow.name(
  "automation.list-by-project",
).handler(async (input: { projectId: string }, ctx) => {
  return ctx.step.run("query", async () => {
    return ctx.db
      .select()
      .from(automationRule)
      .where(eq(automationRule.projectId, input.projectId))
      .orderBy(desc(automationRule.createdAt));
  });
});

const getActiveAutomationRules = Workflow.name("automation.get-active").handler(
  async (input: { projectId: string; trigger: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(automationRule)
        .where(
          and(
            eq(automationRule.projectId, input.projectId),
            eq(
              automationRule.trigger,
              input.trigger as
                | "status_change"
                | "assignment_change"
                | "due_date_passed"
                | "task_created"
                | "task_updated",
            ),
            eq(automationRule.isActive, true),
          ),
        );
    });
  },
);

const evaluateAutomationRules = Workflow.name("automation.evaluate").handler(
  async (input: { context: AutomationContext }, ctx) => {
    const rules = await ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(automationRule)
        .where(
          and(
            eq(automationRule.projectId, input.context.taskId),
            eq(
              automationRule.trigger,
              input.context.trigger as
                | "status_change"
                | "assignment_change"
                | "due_date_passed"
                | "task_created"
                | "task_updated",
            ),
            eq(automationRule.isActive, true),
          ),
        );
    });

    const matchingActions: AutomationAction[] = [];

    for (const rule of rules) {
      if (matchesConditions(rule.conditions, input.context.values)) {
        const actions = rule.actions as AutomationAction[];
        if (Array.isArray(actions)) {
          matchingActions.push(...actions);
        }
      }
    }

    return matchingActions;
  },
);

function matchesConditions(
  conditions: unknown,
  values: Record<string, unknown>,
): boolean {
  if (!conditions || typeof conditions !== "object") return true;

  const conds = conditions as Record<string, unknown>;
  for (const [key, expected] of Object.entries(conds)) {
    if (values[key] !== expected) return false;
  }

  return true;
}

export const automations = {
  create: createAutomationRule,
  delete: deleteAutomationRule,
  evaluateRules: evaluateAutomationRules,
  get: getAutomationRuleById,
  getActiveRules: getActiveAutomationRules,
  listByProject: listAutomationRulesByProject,
  update: updateAutomationRule,
};
