import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as authSchema from "../auth/db-schema";
import * as kvStoreSchema from "../kv-store/db-schema";
import * as logSchema from "../log/db-schema";
import * as storageSchema from "../storage/db-schema";
import type { DatabaseConfig } from "./types";

export type { DatabaseConfig } from "./types";

export class DatabaseUnit {
  readonly $name = "database";
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

  async $prepare() {
    const { pushSchema } = await import("drizzle-kit/api");
    const schemas = this.getSchemas();
    const result = await pushSchema(schemas, this.db);
    if (result.statementsToExecute.length > 0) {
      console.log("Applying schema: ", result.statementsToExecute.length);
      // console.log(result.statementsToExecute);
      if (result.hasDataLoss) {
        console.warn("Schema push has data loss warnings:", result.warnings);
      }
      await result.apply();
      console.log("Schema Applied");
    }
  }

  async $destroy() {
    await this.pool.end();
  }

  getSchemas() {
    const schemas = {
      ...authSchema,
      ...logSchema,
      ...storageSchema,
      ...kvStoreSchema,
    };

    return schemas;
  }
}
