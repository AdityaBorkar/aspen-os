import { complianceObligation } from "#/db-schemas";
import { ObligationFiltersSchema } from "#/schemas";
import type { ObligationFilters } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { parse } from "valibot";

const listObligations = Workflow.name("obligation.list").handler(
  async (input: { filters?: ObligationFilters }, ctx) => {
    const { filters } = input;
    const parsed = filters ? parse(ObligationFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.category) {
      conditions.push(eq(complianceObligation.category, parsed.category));
    }
    if (parsed.sourceModule) {
      conditions.push(eq(complianceObligation.source_module, parsed.sourceModule));
    }
    const active = parsed.isActive ?? parsed.active;
    if (active !== undefined) {
      conditions.push(eq(complianceObligation.is_active, active));
    }
    if (parsed.expiryBased !== undefined) {
      conditions.push(eq(complianceObligation.expiry_based, parsed.expiryBased));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let query = ctx.db
      .select()
      .from(complianceObligation)
      .where(whereClause)
      .orderBy(desc(complianceObligation.updated_at))
      .$dynamic();

    if (parsed.limit !== undefined) {
      query = query.limit(parsed.limit);
    }
    if (parsed.offset !== undefined) {
      query = query.offset(parsed.offset);
    }

    return query;
  },
);

export { listObligations };
