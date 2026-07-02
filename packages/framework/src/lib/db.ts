import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import type { DatabaseConfig } from "./types";

let pool: pg.Pool | null = null;

export function getPool(config: DatabaseConfig): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      database: config.database,
      host: config.host,
      max: config.maxConnections ?? 20,
      password: config.password,
      port: config.port,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      user: config.user,
    });
  }
  return pool;
}

export function createDrizzle(
  pool: pg.Pool,
  schema?: Record<string, unknown>,
): NodePgDatabase {
  return drizzle(pool, { schema: schema as any });
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query<
  T extends pg.QueryResultRow = Record<string, unknown>,
>(
  config: DatabaseConfig,
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const client = getPool(config);
  return client.query<T>(text, params);
}
