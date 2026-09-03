import { eq } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type IdTable<TRow> = AnyPgTable & {
  id: AnyPgColumn;
  $inferSelect: TRow;
};

export async function fetchRowOrThrow<TRow>(
  db: PostgresJsDatabase,
  input: { id: string; label: string; table: IdTable<TRow> },
): Promise<TRow> {
  const { id, label, table } = input;
  const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);

  if (!row) {
    throw new Error(`${label} with id "${id}" not found.`);
  }
  // SAFETY: row comes from `db.select().from(table)`, so it is that table's select shape.
  return row as TRow;
}
