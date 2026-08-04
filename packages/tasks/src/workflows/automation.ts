import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { automationRule } from "../db-schema";
import type {
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from "../types";
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

export interface AutomationServiceDeps {
  db: NodePgDatabase;
}

export async function createAutomationRule(
  input: CreateAutomationRuleInput,
  deps: AutomationServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateAutomationRuleSchema, input);

  const [result] = await db
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
}

export async function updateAutomationRule(
  id: string,
  patch: UpdateAutomationRuleInput,
  deps: AutomationServiceDeps,
) {
  const { db } = deps;
  await getAutomationRuleById(id, deps);
  const parsed = parse(UpdateAutomationRuleSchema, patch);

  const [updated] = await db
    .update(automationRule)
    .set({
      actions: parsed.actions,
      conditions: parsed.conditions,
      isActive: parsed.isActive,
      name: parsed.name,
      trigger: parsed.trigger,
      updatedAt: new Date(),
    })
    .where(eq(automationRule.id, id))
    .returning();

  return updated;
}

export async function deleteAutomationRule(
  id: string,
  deps: AutomationServiceDeps,
) {
  const { db } = deps;
  await db.delete(automationRule).where(eq(automationRule.id, id));
}

export async function getAutomationRuleById(
  id: string,
  deps: AutomationServiceDeps,
) {
  const { db } = deps;
  const [result] = await db
    .select()
    .from(automationRule)
    .where(eq(automationRule.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Automation rule with id "${id}" not found.`);
  }

  return result;
}

export async function listAutomationRulesByProject(
  projectId: string,
  deps: AutomationServiceDeps,
) {
  const { db } = deps;
  return db
    .select()
    .from(automationRule)
    .where(eq(automationRule.projectId, projectId))
    .orderBy(desc(automationRule.createdAt));
}

export async function getActiveAutomationRules(
  projectId: string,
  trigger: string,
  deps: AutomationServiceDeps,
) {
  const { db } = deps;
  return db
    .select()
    .from(automationRule)
    .where(
      and(
        eq(automationRule.projectId, projectId),
        eq(
          automationRule.trigger,
          trigger as
            | "status_change"
            | "assignment_change"
            | "due_date_passed"
            | "task_created"
            | "task_updated",
        ),
        eq(automationRule.isActive, true),
      ),
    );
}

export async function evaluateAutomationRules(
  context: AutomationContext,
  deps: AutomationServiceDeps,
): Promise<AutomationAction[]> {
  const rules = await getActiveAutomationRules(
    context.taskId,
    context.trigger,
    deps,
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
}

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
