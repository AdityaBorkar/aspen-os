import { healthcareExplorerGrant } from "#/db-schemas/staff";
import { QueryExplorerSchema } from "#/schemas/operations";
import { healthcareExplorerTables, serializeExplorerRow } from "#/workflow-steps/explorer-tables";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ExplorerQueryInputSchema = object({ input: QueryExplorerSchema });

export const explorerQuery = Workflow.name("healthcare.operations.explorer-query")
  .input(ExplorerQueryInputSchema)
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
    const grants = await ctx.step.run("load-grants", async () =>
      ctx.db
        .select()
        .from(healthcareExplorerGrant)
        .where(
          and(
            eq(healthcareExplorerGrant.branch_id, branchId),
            eq(healthcareExplorerGrant.grantee_id, ctx.actorId ?? ""),
          ),
        )
        .limit(200),
    );
    const grant = grants.find(
      (row) =>
        (row.scope === "*" || row.scope === parsed.collection) &&
        (!row.expires_at || row.expires_at.getTime() > Date.now()),
    );
    if (!grant) {
      throw new Error("Explorer access not granted; request an ExplorerGrant first");
    }
    const rows = await ctx.step.run("run-query", async () =>
      ctx.db
        .select()
        .from(table)
        .where(eq(table.branch_id, branchId))
        .limit(parsed.limit ?? 100),
    );
    return rows.map((row) => serializeExplorerRow(row));
  });
