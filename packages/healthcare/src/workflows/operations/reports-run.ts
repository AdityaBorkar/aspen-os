import { healthcareReportDefinition } from "#/db-schemas/operations";
import { RunReportSchema } from "#/schemas/operations";
import { serializeExplorerRow, healthcareExplorerTables } from "#/workflow-steps/explorer-tables";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ReportsRunInputSchema = object({ input: RunReportSchema });

export const reportsRun = Workflow.name("healthcare.operations.reports-run")
  .input(ReportsRunInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RunReportSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [def] = await ctx.step.run("load-definition", async () =>
      ctx.db
        .select()
        .from(healthcareReportDefinition)
        .where(eq(healthcareReportDefinition.id, parsed.reportId))
        .limit(1),
    );
    if (!def) {
      throw new Error("Report definition not found; verify the report id and retry");
    }
    // SAFETY: the allowlist guard above narrows `collection` to a registry key, so the
    // indexed access only satisfies the keyof constraint for the lookup.
    const table = healthcareExplorerTables[def.collection as keyof typeof healthcareExplorerTables];
    if (!table) {
      throw new Error(
        `Collection ${def.collection} is not explorable; use an allowlisted collection`,
      );
    }
    const limit = parsed.limit ?? 500;
    const rows = await ctx.step.run("run-report", async () =>
      ctx.db.select().from(table).where(eq(table.branch_id, branchId)).limit(limit),
    );
    const serialized = rows.map((row) => serializeExplorerRow(row)).slice(0, limit);
    return { reportId: parsed.reportId, rowCount: serialized.length, rows: serialized };
  });
