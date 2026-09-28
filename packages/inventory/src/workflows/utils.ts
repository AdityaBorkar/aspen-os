import { and } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

export function assertReturned<TRow>(row: TRow | undefined, message: string): TRow {
  if (!row) {
    throw new Error(message);
  }
  return row;
}

export function requireStatus(
  status: string,
  allowed: readonly string[],
  verb: string,
  noun: string,
): void {
  if (!allowed.includes(status)) {
    throw new Error(`Only ${allowed.join("/")} ${noun} can ${verb} (current: ${status}).`);
  }
}

export function assertDraft(status: string, noun: string): void {
  requireStatus(status, ["draft"], "be edited", noun);
}

export function paginationOf(parsed: { limit?: number; offset?: number }) {
  return { limit: parsed.limit ?? 50, offset: parsed.offset ?? 0 };
}

export function whereFrom(conditions: SQL[]): SQL | undefined {
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export type { AnyPgColumn, PgTable };
