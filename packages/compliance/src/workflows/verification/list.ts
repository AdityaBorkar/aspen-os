import { complianceVerificationRule } from "#/db-schemas";
import type { ComplianceCategory } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";

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
    const { filters } = input;
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(complianceVerificationRule.category, filters.category));
    }
    if (filters?.sourceModule) {
      conditions.push(eq(complianceVerificationRule.sourceModule, filters.sourceModule));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(complianceVerificationRule.isActive, filters.isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(complianceVerificationRule)
      .where(whereClause)
      .orderBy(asc(complianceVerificationRule.priority));
  },
);

export { listVerificationRules };
