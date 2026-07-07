import { pushSchema } from "drizzle-kit/api";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import type { DatabaseConfig } from "../types";
import { getSchemas } from "./get-schemas";

export class DatabaseUnit {
  readonly name = "database";
  readonly pool: pg.Pool;
  readonly db: NodePgDatabase;
  readonly config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.pool = new pg.Pool({
      database: config.database,
      host: config.host,
      max: config.maxConnections ?? 20,
      password: config.password,
      port: config.port,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      user: config.user,
    });
    this.db = drizzle(this.pool);
    this.config = config;
  }

  async prepare(): Promise<void> {
    const schemas = getSchemas();
    const result = await pushSchema(schemas, this.db);
    if (result.statementsToExecute.length > 0) {
      if (result.hasDataLoss) {
        console.warn("Schema push has data loss warnings:", result.warnings);
      }
      await result.apply();
    }
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
