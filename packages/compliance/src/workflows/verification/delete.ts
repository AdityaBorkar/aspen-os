import { complianceVerificationRule } from "#/db-schemas";
import { fetchRuleStep } from "#/workflow-steps/fetch-rule";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

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

export { deleteVerificationRule };
