import type { PgTable } from "drizzle-orm/pg-core";
import type { Relations } from "drizzle-orm/relations";

/** A name-keyed map of drizzle table schemas and relation configs registered by units and modules. */
export type SchemaMap = Record<string, PgTable | Relations>;

/** A value that survives JSON serialization (Dates become ISO strings; undefined fields are dropped). */
export type JsonValue =
  | boolean
  | number
  | string
  | null
  | undefined
  | Date
  | JsonValue[]
  | { [key: string]: JsonValue };
