import { complianceVerificationRule } from "#/db-schemas";
import type { ComplianceCategory } from "#/utils/constants";
import { assertNonNegativeInt } from "#/workflows/document/shared";

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
      limit?: number;
      offset?: number;
    },
    ctx,
  ) => {
    const { filters, limit, offset } = input;
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(complianceVerificationRule.category, filters.category));
    }
    if (filters?.sourceModule) {
      conditions.push(eq(complianceVerificationRule.source_module, filters.sourceModule));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(complianceVerificationRule.is_active, filters.isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    assertNonNegativeInt("limit", limit);
    assertNonNegativeInt("offset", offset);

    let query = ctx.db
      .select()
      .from(complianceVerificationRule)
      .where(whereClause)
      .orderBy(asc(complianceVerificationRule.priority))
      .$dynamic();

    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.offset(offset);
    }

    return query;
  },
);

export { listVerificationRules };
