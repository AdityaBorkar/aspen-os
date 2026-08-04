import { and, asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import type { ComplianceCategory } from "../constants";
import {
  type ComplianceVerificationRule,
  complianceVerificationRule,
} from "../db-schema";
import { writeAuditEntry } from "../services/audit-writer";
import {
  type CreateVerificationRuleInput,
  CreateVerificationRuleSchema,
  type UpdateVerificationRuleInput,
  UpdateVerificationRuleSchema,
} from "../types";

export interface VerificationDeps {
  db: NodePgDatabase;
}

export async function createVerificationRule(
  input: CreateVerificationRuleInput,
  { db }: VerificationDeps,
) {
  const parsed = parse(CreateVerificationRuleSchema, input);

  const [result] = await db
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

  await writeAuditEntry(
    {
      action: "created",
      entityId: result.id,
      entityType: "verification_rule",
      newState: result,
    },
    { db },
  );

  return result;
}

export async function updateVerificationRule(
  id: string,
  patch: UpdateVerificationRuleInput,
  { db }: VerificationDeps,
) {
  const current = await getVerificationRuleById(id, { db });
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

  const [updated] = await db
    .update(complianceVerificationRule)
    .set(updateData)
    .where(eq(complianceVerificationRule.id, id))
    .returning();

  if (!updated) throw new Error("Database operation returned no result");

  await writeAuditEntry(
    {
      action: "updated",
      entityId: id,
      entityType: "verification_rule",
      newState: updated,
      previousState: current,
    },
    { db },
  );

  return updated;
}

export async function deleteVerificationRule(
  id: string,
  { db }: VerificationDeps,
) {
  await getVerificationRuleById(id, { db });

  await db
    .delete(complianceVerificationRule)
    .where(eq(complianceVerificationRule.id, id));

  await writeAuditEntry(
    {
      action: "updated",
      entityId: id,
      entityType: "verification_rule",
      notes: "Verification rule deleted",
    },
    { db },
  );
}

export async function getVerificationRuleById(
  id: string,
  { db }: VerificationDeps,
): Promise<ComplianceVerificationRule> {
  const [result] = await db
    .select()
    .from(complianceVerificationRule)
    .where(eq(complianceVerificationRule.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Verification rule with id "${id}" not found.`);
  }

  return result;
}

export async function listVerificationRules(
  filters:
    | {
        category?: ComplianceCategory;
        sourceModule?: string;
        isActive?: boolean;
      }
    | undefined,
  { db }: VerificationDeps,
) {
  const conditions = [];

  if (filters?.category) {
    conditions.push(eq(complianceVerificationRule.category, filters.category));
  }
  if (filters?.sourceModule) {
    conditions.push(
      eq(complianceVerificationRule.sourceModule, filters.sourceModule),
    );
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(complianceVerificationRule.isActive, filters.isActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(complianceVerificationRule)
    .where(whereClause)
    .orderBy(asc(complianceVerificationRule.priority));
}

export async function matchVerificationRule(
  document: {
    category: ComplianceCategory;
    sourceModule: string;
  },
  deps: VerificationDeps,
): Promise<ComplianceVerificationRule | null> {
  const rules = await listVerificationRules({ isActive: true }, deps);

  for (const rule of rules) {
    const categoryMatch = !rule.category || rule.category === document.category;
    const moduleMatch =
      !rule.sourceModule || rule.sourceModule === document.sourceModule;

    if (categoryMatch && moduleMatch) {
      return rule;
    }
  }

  return null;
}
