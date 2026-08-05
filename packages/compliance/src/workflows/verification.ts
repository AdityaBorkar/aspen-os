import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

import type { ComplianceCategory } from "../constants";
import {
  type ComplianceVerificationRule,
  complianceVerificationRule,
} from "../db-schema";
import {
  CreateVerificationRuleSchema,
  type UpdateVerificationRuleInput,
  UpdateVerificationRuleSchema,
} from "../types";

const CreateInputSchema = object({ input: CreateVerificationRuleSchema });

const fetchRuleStep = WorkflowStep.name("fetch-rule").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(complianceVerificationRule)
      .where(eq(complianceVerificationRule.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Verification rule with id "${input.id}" not found.`);
    }

    return result;
  },
);

const getVerificationRuleById = Workflow.name("verification.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchRuleStep, { id: input.id });
  },
);

const createVerificationRule = Workflow.name("verification.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(complianceVerificationRule)
      .values({
        assignedReviewer: parsed.assignedReviewer ?? null,
        category: parsed.category ?? null,
        isActive: parsed.isActive ?? true,
        name: parsed.name,
        priority: parsed.priority ?? 0,
        requiredReviewerRole: parsed.requiredReviewerRole ?? null,
        sourceModule: parsed.sourceModule ?? null,
      })
      .returning();

    if (!result) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "created",
      crudAction: "create",
      entityId: result.id,
      entityType: "verification_rule",
      newState: result as unknown as Record<string, unknown>,
    });

    return result;
  });

const updateVerificationRule = Workflow.name("verification.update").handler(
  async (input: { id: string; patch: UpdateVerificationRuleInput }, ctx) => {
    const { id, patch } = input;
    const current = await ctx.step.run(fetchRuleStep, { id });
    const parsed = parse(UpdateVerificationRuleSchema, patch);

    const updateData: Record<string, unknown> = {};

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.category !== undefined) updateData.category = parsed.category;
    if (parsed.sourceModule !== undefined)
      updateData.sourceModule = parsed.sourceModule;
    if (parsed.assignedReviewer !== undefined)
      updateData.assignedReviewer = parsed.assignedReviewer;
    if (parsed.requiredReviewerRole !== undefined)
      updateData.requiredReviewerRole = parsed.requiredReviewerRole;
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive;
    if (parsed.priority !== undefined) updateData.priority = parsed.priority;

    if (Object.keys(updateData).length === 0) return current;

    const [updated] = await ctx.db
      .update(complianceVerificationRule)
      .set(updateData)
      .where(eq(complianceVerificationRule.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "updated",
      crudAction: "update",
      entityId: id,
      entityType: "verification_rule",
      newState: updated as unknown as Record<string, unknown>,
      previousState: current as unknown as Record<string, unknown>,
    });

    return updated;
  },
);

const deleteVerificationRule = Workflow.name("verification.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.step.run(fetchRuleStep, { id: input.id });

    await ctx.db
      .delete(complianceVerificationRule)
      .where(eq(complianceVerificationRule.id, input.id));

    await ctx.audit.write({
      action: "updated",
      crudAction: "delete",
      entityId: input.id,
      entityType: "verification_rule",
      metadata: { note: "Verification rule deleted" },
    });
  },
);

const listVerificationRules = Workflow.name("verification.list").handler(
  async (
    input: {
      filters?: {
        category?: ComplianceCategory;
        sourceModule?: string;
        isActive?: boolean;
      };
    },
    ctx,
  ) => {
    const filters = input.filters;
    const conditions = [];

    if (filters?.category) {
      conditions.push(
        eq(complianceVerificationRule.category, filters.category),
      );
    }
    if (filters?.sourceModule) {
      conditions.push(
        eq(complianceVerificationRule.sourceModule, filters.sourceModule),
      );
    }
    if (filters?.isActive !== undefined) {
      conditions.push(
        eq(complianceVerificationRule.isActive, filters.isActive),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(complianceVerificationRule)
      .where(whereClause)
      .orderBy(asc(complianceVerificationRule.priority));
  },
);

const matchVerificationRule = Workflow.name("verification.match").handler(
  async (
    input: { document: { category: ComplianceCategory; sourceModule: string } },
    ctx,
  ): Promise<ComplianceVerificationRule | null> => {
    const rules = await ctx.db
      .select()
      .from(complianceVerificationRule)
      .where(eq(complianceVerificationRule.isActive, true))
      .orderBy(asc(complianceVerificationRule.priority));

    const document = input.document;
    for (const rule of rules) {
      const categoryMatch =
        !rule.category || rule.category === document.category;
      const moduleMatch =
        !rule.sourceModule || rule.sourceModule === document.sourceModule;

      if (categoryMatch && moduleMatch) {
        return rule;
      }
    }

    return null;
  },
);

export const verification = {
  create: createVerificationRule,
  delete: deleteVerificationRule,
  get: getVerificationRuleById,
  getById: getVerificationRuleById,
  list: listVerificationRules,
  match: matchVerificationRule,
  update: updateVerificationRule,
} as const;
