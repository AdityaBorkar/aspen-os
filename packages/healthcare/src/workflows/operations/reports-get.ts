import { healthcareReportDefinition } from "#/db-schemas/operations";
import { OperationsIdSchema } from "#/schemas/operations";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ReportsGetInputSchema = object({ input: OperationsIdSchema });

export const reportsGet = Workflow.name("healthcare.operations.reports-get")
  .input(ReportsGetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(OperationsIdSchema, input);
    const [row] = await ctx.step.run("load-report", async () =>
      ctx.db
        .select()
        .from(healthcareReportDefinition)
        .where(eq(healthcareReportDefinition.id, parsed.id))
        .limit(1),
    );
    if (!row) {
      throw new Error("Report definition not found; verify the report id and retry");
    }
    return {
      collection: row.collection,
      filters: row.filters,
      id: row.id,
      name: row.name,
      status: row.status,
    };
  });
