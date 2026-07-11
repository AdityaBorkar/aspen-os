import { and, asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import type { ComplianceCategory } from "../constants";
import {
  type ComplianceVerificationRule,
  complianceVerificationRule,
} from "../db-schema";
import { AuditWriter } from "../services/audit-writer";
import {
  type CreateVerificationRuleInput,
  CreateVerificationRuleSchema,
  type UpdateVerificationRuleInput,
  UpdateVerificationRuleSchema,
} from "../types";

export class VerificationWorkflow {
  private auditWriter: AuditWriter;

  constructor(private readonly db: NodePgDatabase) {
    this.auditWriter = new AuditWriter(db);
  }

  async create(input: CreateVerificationRuleInput) {
    const parsed = parse(CreateVerificationRuleSchema, input);

    const [result] = await this.db
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

    await this.auditWriter.write({
      action: "created",
      entityId: result.id,
      entityType: "verification_rule",
      newState: result as unknown as Record<string, unknown>,
    });

    return result;
  }

  async update(id: string, patch: UpdateVerificationRuleInput) {
    const current = await this.getById(id);
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

    const [updated] = await this.db
      .update(complianceVerificationRule)
      .set(updateData)
      .where(eq(complianceVerificationRule.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await this.auditWriter.write({
      action: "updated",
      entityId: id,
      entityType: "verification_rule",
      newState: updated as unknown as Record<string, unknown>,
      previousState: current as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async delete(id: string) {
    await this.getById(id);

    await this.db
      .delete(complianceVerificationRule)
      .where(eq(complianceVerificationRule.id, id));

    await this.auditWriter.write({
      action: "updated",
      entityId: id,
      entityType: "verification_rule",
      notes: "Verification rule deleted",
    });
  }

  async getById(id: string): Promise<ComplianceVerificationRule> {
    const [result] = await this.db
      .select()
      .from(complianceVerificationRule)
      .where(eq(complianceVerificationRule.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Verification rule with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: {
    category?: ComplianceCategory;
    sourceModule?: string;
    isActive?: boolean;
  }) {
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

    return this.db
      .select()
      .from(complianceVerificationRule)
      .where(whereClause)
      .orderBy(asc(complianceVerificationRule.priority));
  }

  async match(document: {
    category: ComplianceCategory;
    sourceModule: string;
  }): Promise<ComplianceVerificationRule | null> {
    const rules = await this.list({ isActive: true });

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
  }
}
