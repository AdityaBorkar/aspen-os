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

export class DatabaseUnit {
  readonly name = "database";
  readonly pool: pg.Pool;
  readonly db: NodePgDatabase;
  readonly config: DatabaseConfig;

  constructor(config: DatabaseConfig, schema?: Record<string, unknown>) {
    this.pool = getPool(config);
    this.db = createDrizzle(this.pool, schema);
    this.config = config;
  }

  async destroy(): Promise<void> {
    await this.pool.end();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}
