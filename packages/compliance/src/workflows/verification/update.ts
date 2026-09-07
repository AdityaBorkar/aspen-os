import { complianceVerificationRule } from "#/db-schemas";
import type { NewComplianceVerificationRule } from "#/db-schemas";
import { UpdateVerificationRuleSchema } from "#/schemas";
import type { UpdateVerificationRuleInput } from "#/schemas";
import { fetchRuleStep } from "#/workflow-steps/fetch-rule";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { parse } from "valibot";

const updateVerificationRule = Workflow.name("verification.update").handler(
  async (input: { id: string; patch: UpdateVerificationRuleInput }, ctx) => {
    const { id, patch } = input;
    const current = await ctx.step.run(fetchRuleStep, { id });
    const parsed = parse(UpdateVerificationRuleSchema, patch);

    const updateData: Partial<NewComplianceVerificationRule> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        Object.assign(updateData, { [key]: value });
      }
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
      actorId: ctx.actorId,
      crudAction: "update",
      entityId: id,
      entityType: "verification_rule",
      newState: updated,
      previousState: current,
    });

    return updated;
  },
);

export { updateVerificationRule };
