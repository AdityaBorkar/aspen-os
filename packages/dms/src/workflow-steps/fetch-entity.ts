import { WithIdSchema } from "#/schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

export function makeFetchStep<TTable extends PgTable & { id: AnyPgColumn }>(
  name: string,
  table: TTable,
  noun: string,
  inputSchema: typeof WithIdSchema = WithIdSchema,
): WorkflowStep<{ id: string }, TTable["$inferSelect"]> {
  // SAFETY: the generic table is a concrete drizzle PgTable at every call site,
  // so widening only satisfies the `from()` conditional-table check.
  const source: PgTable = table;
  return WorkflowStep.name(name)
    .input(inputSchema)
    .handler(async (input, ctx) => {
      const [row] = await ctx.db.select().from(source).where(eq(table.id, input.id)).limit(1);
      if (!row) {
        throw new Error(`${noun} with id "${input.id}" not found.`);
      }
      // SAFETY: `source` aliases `table`, so the selected row is the table's row type.
      return row;
    });
}
