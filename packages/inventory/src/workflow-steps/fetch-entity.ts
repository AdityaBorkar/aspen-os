import { WithIdSchema } from "#/schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

export function makeFetchStep<TTable extends PgTable & { id: AnyPgColumn }>(
  name: string,
  table: TTable,
  noun: string,
): WorkflowStep<{ id: string }, TTable["$inferSelect"]> {
  const source: PgTable = table;
  return WorkflowStep.name(name)
    .input(WithIdSchema)
    .handler(async (input, ctx) => {
      const [row] = await ctx.db.select().from(source).where(eq(table.id, input.id)).limit(1);
      if (!row) {
        throw new Error(`${noun} with id "${input.id}" not found.`);
      }
      return row;
    });
}
