import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as authSchema from "../auth/db-schema";
import { context } from "../context";
import * as kvStoreSchema from "../kv-store/db-schema";
import * as logSchema from "../log/db-schema";
import * as storageSchema from "../storage/db-schema";
import type { TenancyConfig, TenancyMode } from "../tenancy/types";
import type { DatabaseConfig } from "./types";

export type { DatabaseConfig } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export class DatabaseUnit {
  readonly $name = "db";
  readonly config: DatabaseConfig;
  readonly tenancyMode: TenancyMode;
  readonly tenantResolver;

  private readonly controlPlanePool: pg.Pool;
  private readonly controlPlaneDbInstance: DrizzleDB;
  private readonly tenantPools: Map<string, { db: DrizzleDB; pool: pg.Pool }> =
    new Map();
  private readonly dbWrapper: DrizzleDB;

  constructor(config: DatabaseConfig, tenancy: TenancyConfig) {
    this.config = config;
    this.tenancyMode = tenancy.mode;
    this.tenantResolver =
      tenancy.mode === "isolated-db" ? tenancy.tenantResolver : undefined;

    this.controlPlanePool = new pg.Pool({
      database: config.database,
      host: config.host,
      max: config.maxConnections ?? 20,
      password: config.password,
      port: config.port,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      user: config.user,
    });
    this.controlPlaneDbInstance = drizzle(this.controlPlanePool);

    this.dbWrapper = this.createDbWrapper();
  }

  get db(): DrizzleDB {
    return this.dbWrapper;
  }

  get controlPlaneDb(): DrizzleDB {
    return this.controlPlaneDbInstance;
  }

  get pool(): pg.Pool {
    return this.controlPlanePool;
  }

  async $prepare() {
    const schemas = this.getSchemas();
    await this.pushSchemasTo(this.controlPlaneDbInstance, schemas);
  }

  async $destroy() {
    await this.controlPlanePool.end();
    for (const { pool } of this.tenantPools.values()) {
      await pool.end();
    }
    this.tenantPools.clear();
  }

  getSchemas() {
    return {
      ...authSchema,
      ...logSchema,
      ...storageSchema,
      ...kvStoreSchema,
    };
  }

  async getTenantDb(tenantId: string): Promise<DrizzleDB> {
    let entry = this.tenantPools.get(tenantId);
    if (!entry) {
      if (!this.tenantResolver) {
        throw new Error(
          "Tenant resolution is not available — tenancy mode is not isolated-db",
        );
      }
      const tenantConfig = await this.tenantResolver.resolve(tenantId);
      const pool = new pg.Pool({
        database: tenantConfig.database,
        host: tenantConfig.host,
        max: tenantConfig.maxConnections ?? 20,
        password: tenantConfig.password,
        port: tenantConfig.port,
        ssl: tenantConfig.ssl ? { rejectUnauthorized: false } : false,
        user: tenantConfig.user,
      });
      const db = drizzle(pool);
      entry = { db, pool };
      this.tenantPools.set(tenantId, entry);
    }
    return entry.db;
  }

  async applyRlsPolicies(db: DrizzleDB): Promise<void> {
    await db.execute(sql`
      DO $$ BEGIN
        CREATE ROLE tenant_role NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await db.execute(sql`GRANT tenant_role TO current_user;`);
    await db.execute(sql`GRANT USAGE ON SCHEMA public TO tenant_role;`);
    await db.execute(
      sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenant_role;`,
    );

    const tableNames = await this.discoverTenantTables(db);
    for (const tableName of tableNames) {
      await db.execute(sql`
        ALTER TABLE ${sql.identifier(tableName)} ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation ON ${sql.identifier(tableName)};
        CREATE POLICY tenant_isolation ON ${sql.identifier(tableName)}
          FOR ALL TO tenant_role
          USING (tenant_id = current_setting('app.tenant_id', true))
          WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      `);
    }
  }

  async pushSchemasToTenant(
    tenantId: string,
    moduleSchemas: Record<string, unknown>,
  ): Promise<void> {
    const db = await this.getTenantDb(tenantId);
    const allSchemas = { ...this.getSchemas(), ...moduleSchemas };
    await this.pushSchemasTo(db, allSchemas);
  }

  private createDbWrapper(): DrizzleDB {
    const self = this;
    return new Proxy({} as DrizzleDB, {
      get(_target, prop) {
        const ctx = context.getStore();
        const realDb = ctx?.db ?? self.controlPlaneDbInstance;
        const value = Reflect.get(realDb, prop);
        if (typeof value === "function") {
          return value.bind(realDb);
        }
        return value;
      },
    });
  }

  private async discoverTenantTables(db: DrizzleDB): Promise<string[]> {
    const result = await db.execute(
      sql`
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'tenant_id'
          AND table_schema = 'public'
      `,
    );
    const rows = result.rows as Array<{ table_name: string }>;
    return rows
      .map((r) => r.table_name)
      .filter((name) => /^[a-z_][a-z0-9_]*$/.test(name));
  }

  private async pushSchemasTo(
    db: DrizzleDB,
    schemas: Record<string, unknown>,
  ): Promise<void> {
    const { pushSchema } = await import("drizzle-kit/api");
    const result = await pushSchema(schemas, db);
    if (result.statementsToExecute.length > 0) {
      console.log(`Applying ${result.statementsToExecute.length} Statements`);
      if (result.hasDataLoss) {
        console.warn("Schema push has data loss warnings:", result.warnings);
      }
      await result.apply();
      console.log("Schema Applied");
    }
  }
}
