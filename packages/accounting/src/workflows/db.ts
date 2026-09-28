import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type AccountingTransaction = Parameters<Parameters<PostgresJsDatabase["transaction"]>[0]>[0];

export type Db = PostgresJsDatabase | AccountingTransaction;
