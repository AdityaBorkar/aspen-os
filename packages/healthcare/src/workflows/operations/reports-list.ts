import { healthcareReportDefinition } from "#/db-schemas/operations";
import { ReportFiltersSchema } from "#/schemas/operations";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ReportsListInputSchema = object({ input: ReportFiltersSchema });

export const reportsList = Workflow.name("healthcare.operations.reports-list")
  .input(ReportsListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ReportFiltersSchema, input);
    const filters = [eq(healthcareReportDefinition.branch_id, parsed.branchId ?? "main")];
    if (parsed.collection) {
      filters.push(eq(healthcareReportDefinition.collection, parsed.collection));
    }
    const rows = await ctx.step.run("list-reports", async () =>
      ctx.db
        .select()
        .from(healthcareReportDefinition)
        .where(and(...filters))
        .limit(parsed.limit ?? 100),
    );
    return rows.map((row) => ({
      collection: row.collection,
      id: row.id,
      name: row.name,
      status: row.status,
    }));
  });
