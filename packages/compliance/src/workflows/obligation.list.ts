import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { parse } from "valibot";

import { complianceObligation } from "../db-schemas";
import { type ObligationFilters, ObligationFiltersSchema } from "../types";

const listObligations = Workflow.name("obligation.list").handler(
  async (input: { filters?: ObligationFilters }, ctx) => {
    const filters = input.filters;
    const parsed = filters ? parse(ObligationFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.category) {
      conditions.push(eq(complianceObligation.category, parsed.category));
    }
    if (parsed.sourceModule) {
      conditions.push(
        eq(complianceObligation.sourceModule, parsed.sourceModule),
      );
    }
    if (parsed.active !== undefined) {
      conditions.push(eq(complianceObligation.isActive, parsed.active));
    }
    if (parsed.expiryBased !== undefined) {
      conditions.push(eq(complianceObligation.expiryBased, parsed.expiryBased));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(complianceObligation)
      .where(whereClause)
      .orderBy(desc(complianceObligation.updatedAt));
  },
);

export { listObligations };
