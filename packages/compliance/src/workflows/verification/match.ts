import { complianceVerificationRule } from "#/db-schemas";
import type { ComplianceVerificationRule } from "#/db-schemas";
import type { ComplianceCategory } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, isNull, or } from "drizzle-orm";

const matchVerificationRule = Workflow.name("verification.match").handler(
  async (
    input: { document: { category: ComplianceCategory; sourceModule: string } },
    ctx,
  ): Promise<ComplianceVerificationRule | null> => {
    const { document } = input;
    const [rule] = await ctx.db
      .select()
      .from(complianceVerificationRule)
      .where(
        and(
          eq(complianceVerificationRule.is_active, true),
          or(
            isNull(complianceVerificationRule.category),
            eq(complianceVerificationRule.category, document.category),
          ),
          or(
            isNull(complianceVerificationRule.source_module),
            eq(complianceVerificationRule.source_module, document.sourceModule),
          ),
        ),
      )
      .orderBy(asc(complianceVerificationRule.priority))
      .limit(1);

    return rule ?? null;
  },
);

export { matchVerificationRule };
