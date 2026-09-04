import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/** Transaction object yielded by `PostgresJsDatabase.transaction()`. */
export type HrTransaction = Parameters<Parameters<PostgresJsDatabase["transaction"]>[0]>[0];

/** Any database handle a workflow helper accepts: the request db or a transaction. */
export type Db = PostgresJsDatabase | HrTransaction;
