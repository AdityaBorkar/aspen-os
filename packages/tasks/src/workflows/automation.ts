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

interface AutomationContext {
  taskId: string;
  trigger: string;
  values: Record<string, unknown>;
}

interface AutomationAction {
  field?: string;
  type: string;
  value?: unknown;
}

export class AutomationWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateAutomationRuleInput) {
    const parsed = parse(CreateAutomationRuleSchema, input);

    const [result] = await this.db
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

  async update(id: string, patch: UpdateAutomationRuleInput) {
    await this.getById(id);
    const parsed = parse(UpdateAutomationRuleSchema, patch);

    const [updated] = await this.db
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

  async delete(id: string) {
    await this.db.delete(automationRule).where(eq(automationRule.id, id));
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(automationRule)
      .where(eq(automationRule.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Automation rule with id "${id}" not found.`);
    }

    return result;
  }

  async listByProject(projectId: string) {
    return this.db
      .select()
      .from(automationRule)
      .where(eq(automationRule.projectId, projectId))
      .orderBy(desc(automationRule.createdAt));
  }

  async getActiveRules(projectId: string, trigger: string) {
    return this.db
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

  async evaluateRules(context: AutomationContext): Promise<AutomationAction[]> {
    const rules = await this.getActiveRules(context.taskId, context.trigger);
    const matchingActions: AutomationAction[] = [];

    for (const rule of rules) {
      if (this.matchesConditions(rule.conditions, context.values)) {
        const actions = rule.actions as AutomationAction[];
        if (Array.isArray(actions)) {
          matchingActions.push(...actions);
        }
      }
    }

    return matchingActions;
  }

  private matchesConditions(
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
}
