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
      conditions.push(eq(complianceVerificationRule.sourceModule, filters.sourceModule));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(complianceVerificationRule.isActive, filters.isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let query = ctx.db
      .select()
      .from(complianceVerificationRule)
      .where(whereClause)
      .orderBy(asc(complianceVerificationRule.priority))
      .$dynamic();

    if (limit !== undefined) {
      if (!Number.isInteger(limit) || limit < 0) {
        throw new Error("limit must be an integer >= 0");
      }
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      if (!Number.isInteger(offset) || offset < 0) {
        throw new Error("offset must be an integer >= 0");
      }
      query = query.offset(offset);
    }

    return query;
  },
);

export { listVerificationRules };
