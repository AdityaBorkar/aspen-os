import { complianceVerificationRule } from "#/db-schemas";
import type { ComplianceVerificationRule } from "#/db-schemas";
import type { ComplianceCategory } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";

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

    const { document } = input;
    for (const rule of rules) {
      const categoryMatch = !rule.category || rule.category === document.category;
      const moduleMatch = !rule.sourceModule || rule.sourceModule === document.sourceModule;

      if (categoryMatch && moduleMatch) {
        return rule;
      }
    }

    return null;
  },
);

export { matchVerificationRule };
