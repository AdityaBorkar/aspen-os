import { QueryExplorerSchema } from "#/schemas/operations";
import { healthcareExplorerTables, serializeExplorerRow } from "#/workflow-steps/explorer-tables";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ExplorerExportCsvInputSchema = object({ input: QueryExplorerSchema });

export const explorerExportCsv = Workflow.name("healthcare.operations.explorer-export-csv")
  .input(ExplorerExportCsvInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(QueryExplorerSchema, input);
    const branchId = parsed.branchId ?? "main";
    // SAFETY: the presence check below treats the registry as the allowlist, so the
    // indexed access only satisfies the keyof constraint for the lookup.
    const table =
      healthcareExplorerTables[parsed.collection as keyof typeof healthcareExplorerTables];
    if (!table) {
      throw new Error(
        `Collection ${parsed.collection} is not explorable; use an allowlisted collection`,
      );
    }
    const rows = await ctx.step.run("load-rows", async () =>
      ctx.db
        .select()
        .from(table)
        .where(eq(table.branch_id, branchId))
        .limit(parsed.limit ?? 500),
    );
    const serialized = rows.map((row) => serializeExplorerRow(row));
    if (serialized.length === 0) {
      return { collection: parsed.collection, csv: "" };
    }
    const headers = Object.keys(serialized[0] ?? {});
    const lines = serialized.map((row) =>
      headers.map((header) => JSON.stringify(row[header] ?? "")).join(","),
    );
    return { collection: parsed.collection, csv: [headers.join(","), ...lines].join("\n") };
  });
