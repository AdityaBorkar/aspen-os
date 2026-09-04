import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { object, string } from "valibot";

export interface FetchByIdStepInput {
  idColumn: PgColumn;
  label: string;
  stepName: string;
  table: PgTable;
}

export function defineFetchByIdStep<TRow>(input: FetchByIdStepInput) {
  const { idColumn, label, stepName, table } = input;
  return WorkflowStep.name(stepName)
    .input(object({ id: string() }))
    .handler(async (stepInput, ctx) => {
      const rows = await ctx.db.select().from(table).where(eq(idColumn, stepInput.id)).limit(1);
      // SAFETY: rows come from selecting the entity's own table; callers pin TRow to that table's $inferSelect.
      const result = rows[0] as TRow | undefined;
      if (!result) {
        throw new Error(`${label} with id "${stepInput.id}" not found.`);
      }
      return result;
    });
}
