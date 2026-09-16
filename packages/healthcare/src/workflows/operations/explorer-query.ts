import { healthcareExplorerGrant } from "#/db-schemas/operations";
import { QueryExplorerSchema } from "#/schemas/operations";
import { healthcareExplorerTables, serializeExplorerRow } from "#/workflow-steps/explorer-tables";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { boolean, is, number, object, parse, record, string, union } from "valibot";

const ExplorerQueryInputSchema = object({ input: QueryExplorerSchema });

const FiltersSchema = record(string(), union([string(), number(), boolean()]));

function parseJsonRecord(raw: string | undefined) {
  if (!raw) {
    return {};
  }
  let value: unknown = undefined;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Explorer filters must be a JSON object of equality clauses.");
  }
  if (!is(FiltersSchema, value)) {
    throw new Error("Explorer filters must be a JSON object of equality clauses.");
  }
  return value;
}

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
    const filters = parseJsonRecord(parsed.filters);
    const columnNames = new Set(Object.keys(table));
    const conditions = [eq(table.branch_id, branchId)];
    for (const [key, value] of Object.entries(filters)) {
      if (columnNames.has(key)) {
        // SAFETY: column names come from the allowlisted table's own keys and
        // values are bound as parameters, so identifier injection is blocked.
        conditions.push(sql`${sql.identifier(key)} = ${value}`);
      }
    }
    const limit = Math.min(parsed.limit ?? 100, 1000);
    const offset = parsed.offset ?? 0;
    const [sortField, sortDir] = (parsed.sort ?? "").split(":");
    const rows = await ctx.step.run("run-query", async () => {
      const where = and(...conditions);
      if (sortField && columnNames.has(sortField)) {
        // SAFETY: sort field is an allowlisted column key, bound as identifier.
        const order =
          sortDir === "desc" ? desc(sql.identifier(sortField)) : asc(sql.identifier(sortField));
        return ctx.db.select().from(table).where(where).orderBy(order).limit(limit).offset(offset);
      }
      return ctx.db.select().from(table).where(where).limit(limit).offset(offset);
    });
    return rows.map((row) => serializeExplorerRow(row));
  });
