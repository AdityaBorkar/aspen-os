import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import type { DatabaseConfig } from "../types";

export function getPool(config: DatabaseConfig): pg.Pool {
  return new pg.Pool({
    database: config.database,
    host: config.host,
    max: config.maxConnections ?? 20,
    password: config.password,
    port: config.port,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    user: config.user,
  });
}

export function createDrizzle(
  pool: pg.Pool,
  schema?: Record<string, unknown>,
): NodePgDatabase {
  return drizzle(pool, { schema: schema as Record<string, never> });
}
