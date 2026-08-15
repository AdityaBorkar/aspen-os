import { complianceVerificationRule } from "#/db-schemas";
import { UpdateVerificationRuleSchema } from "#/types";
import type { UpdateVerificationRuleInput } from "#/types";
import { fetchRuleStep } from "#/workflow-steps/fetch-rule";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { parse } from "valibot";

const updateVerificationRule = Workflow.name("verification.update").handler(
  async (input: { id: string; patch: UpdateVerificationRuleInput }, ctx) => {
    const { id, patch } = input;
    const current = await ctx.step.run(fetchRuleStep, { id });
    const parsed = parse(UpdateVerificationRuleSchema, patch);

    const updateData: Record<string, unknown> = {};

    if (parsed.name !== undefined) {
      updateData.name = parsed.name;
    }
    if (parsed.category !== undefined) {
      updateData.category = parsed.category;
    }
    if (parsed.sourceModule !== undefined) {
      updateData.sourceModule = parsed.sourceModule;
    }
    if (parsed.assignedReviewer !== undefined) {
      updateData.assignedReviewer = parsed.assignedReviewer;
    }
    if (parsed.requiredReviewerRole !== undefined) {
      updateData.requiredReviewerRole = parsed.requiredReviewerRole;
    }
    if (parsed.isActive !== undefined) {
      updateData.isActive = parsed.isActive;
    }
    if (parsed.priority !== undefined) {
      updateData.priority = parsed.priority;
    }

    if (Object.keys(updateData).length === 0) {
      return current;
    }

    const [updated] = await ctx.db
      .update(complianceVerificationRule)
      .set(updateData)
      .where(eq(complianceVerificationRule.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

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

export { updateVerificationRule };
