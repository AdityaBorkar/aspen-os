import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import { db_schemas } from "../db-schemas";
import type { TenancyMode, TenantResolver } from "../index";
import { context } from "../utils/context";
import type {
  DatabaseConfig,
  IsolatedTenantDbConfig,
  IsolatedTenantProvisioningResult,
  SharedTenantProvisioningResult,
  TenantProvisioningResult,
} from "./types";

export type DrizzleDB<
  TSchemas extends Record<string, unknown> = Record<string, never>,
> = NodePgDatabase<TSchemas>;

export class DatabaseUnit<
  TSchemas extends Record<string, unknown> = Record<string, never>,
> {
  readonly $name = "db";
  readonly config: DatabaseConfig;
  readonly tenancyMode: TenancyMode;
  readonly resolver: TenantResolver | undefined;
  readonly tenantDbPrefix: string | undefined;
  readonly controlPlaneDbName: string | undefined;
  readonly tenantDbDefaults:
    | {
        host?: string;
        password?: string;
        port?: number;
        ssl?: boolean;
        user?: string;
      }
    | undefined;

  protected controlPlanePool: pg.Pool;
  protected controlPlaneDbInstance: DrizzleDB<TSchemas>;
  protected storedControlPlaneSchemas: Record<string, unknown> = {};
  protected storedTenantSchemas: Record<string, unknown> = {};

  private readonly tenantPools: Map<
    string,
    { db: DrizzleDB<TSchemas>; pool: pg.Pool }
  > = new Map();
  private dbWrapper: DrizzleDB<TSchemas>;

  constructor(
    config: DatabaseConfig,
    tenancyMode: TenancyMode,
    options?: {
      resolver?: TenantResolver;
      controlPlaneDbName?: string;
      tenantDbPrefix?: string;
      tenantDbDefaults?: {
        host?: string;
        password?: string;
        port?: number;
        ssl?: boolean;
        user?: string;
      };
    },
  ) {
    this.config = config;
    this.tenancyMode = tenancyMode;
    this.resolver = options?.resolver;
    this.controlPlaneDbName = options?.controlPlaneDbName;
    this.tenantDbPrefix = options?.tenantDbPrefix;
    this.tenantDbDefaults = options?.tenantDbDefaults;

    this.controlPlanePool = new pg.Pool({
      database: config.database,
      host: config.host,
      max: config.maxConnections ?? 20,
      password: config.password,
      port: config.port,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      user: config.user,
    });
    this.controlPlaneDbInstance = drizzle<TSchemas>(
      this.controlPlanePool,
    ) as DrizzleDB<TSchemas>;

    this.dbWrapper = this.createDbWrapper();
  }

  get db(): DrizzleDB<TSchemas> {
    return this.dbWrapper;
  }

  get controlPlaneDb(): DrizzleDB<TSchemas> {
    return this.controlPlaneDbInstance;
  }

  get pool(): pg.Pool {
    return this.controlPlanePool;
  }

  async $prepareInfra(
    controlPlaneSchemas: Record<string, unknown> = {},
    tenantSchemas: Record<string, unknown> = {},
  ) {
    this.storedControlPlaneSchemas = controlPlaneSchemas;
    this.storedTenantSchemas = tenantSchemas;
    const schemas = { ...this.getSchemas(), ...controlPlaneSchemas };
    await this.pushSchemasTo(this.controlPlaneDbInstance, schemas);
  }

  async prepareWithModules<
    TCP extends Record<string, unknown>,
    TT extends Record<string, unknown>,
  >(controlPlaneSchemas: TCP, tenantSchemas: TT): Promise<void> {
    this.storedControlPlaneSchemas = controlPlaneSchemas;
    this.storedTenantSchemas = tenantSchemas;
    const allControlPlaneSchemas = {
      ...this.getSchemas(),
      ...controlPlaneSchemas,
    };
    await this.pushSchemasTo(
      this.controlPlaneDbInstance,
      allControlPlaneSchemas,
    );
  }

  async $cleanup() {
    await this.controlPlanePool.end();
    for (const { pool } of this.tenantPools.values()) {
      await pool.end();
    }
    this.tenantPools.clear();
  }

  async getTenantDb(tenantId: string): Promise<DrizzleDB<TSchemas>> {
    if (this.tenancyMode !== "isolated") {
      throw new Error("getTenantDb is only available in isolated tenancy mode");
    }

    let entry = this.tenantPools.get(tenantId);
    if (!entry) {
      const database = await this.resolver?.resolve(tenantId);
      const pool = new pg.Pool({
        database,
        host: this.tenantDbDefaults?.host ?? this.config.host,
        password: this.tenantDbDefaults?.password ?? this.config.password,
        port: this.tenantDbDefaults?.port ?? this.config.port,
        ssl:
          (this.tenantDbDefaults?.ssl ?? this.config.ssl)
            ? { rejectUnauthorized: false }
            : false,
        user: this.tenantDbDefaults?.user ?? this.config.user,
      });
      const db = drizzle(pool) as DrizzleDB<TSchemas>;
      entry = { db, pool };
      this.tenantPools.set(tenantId, entry);
    }
    return entry.db;
  }

  async pushSchemasToTenant(
    tenantId: string,
    tenantSchemas: Record<string, unknown>,
  ): Promise<void> {
    const db = await this.getTenantDb(tenantId);
    const allTenantSchemas = { ...this.getSchemas(), ...tenantSchemas };
    await this.pushSchemasTo(db, allTenantSchemas);
  }

  async provisionTenant(
    tenantId: string,
    options?: {
      databaseName?: string;
      host?: string;
      password?: string;
      port?: number;
      ssl?: boolean;
      user?: string;
    },
  ): Promise<TenantProvisioningResult> {
    if (this.tenancyMode === "shared") {
      return {
        tenancyMode: "shared",
        tenantId,
      } satisfies SharedTenantProvisioningResult;
    }

    if (this.tenancyMode === "isolated") {
      const database =
        options?.databaseName ??
        (this.tenantDbPrefix ? `${this.tenantDbPrefix}_${tenantId}` : tenantId);

      const dbConfig: IsolatedTenantDbConfig = {
        database,
        host: options?.host ?? this.tenantDbDefaults?.host ?? this.config.host,
        password:
          options?.password ??
          this.tenantDbDefaults?.password ??
          this.config.password,
        port: options?.port ?? this.tenantDbDefaults?.port ?? this.config.port,
        ssl:
          options?.ssl ??
          this.tenantDbDefaults?.ssl ??
          this.config.ssl ??
          false,
        user: options?.user ?? this.tenantDbDefaults?.user ?? this.config.user,
      };

      await this.createTenantDatabase(dbConfig);

      const pool = new pg.Pool({
        database: dbConfig.database,
        host: dbConfig.host,
        password: dbConfig.password,
        port: dbConfig.port,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
        user: dbConfig.user,
      });
      const tenantDb = drizzle(pool) as DrizzleDB<TSchemas>;
      try {
        const allTenantSchemas = {
          ...this.getSchemas(),
          ...this.storedTenantSchemas,
        };
        await this.pushSchemasTo(tenantDb, allTenantSchemas);
      } finally {
        await pool.end();
      }

      return {
        tenancyMode: "isolated",
        ...dbConfig,
      } satisfies IsolatedTenantProvisioningResult;
    }

    throw new Error(
      `Tenant provisioning is not supported in ${this.tenancyMode} tenancy mode`,
    );
  }

  async runWithTenant<T>(
    tenantId: string,
    fn: (db: DrizzleDB<TSchemas>) => T | Promise<T>,
  ): Promise<T> {
    if (this.tenancyMode !== "shared") {
      throw new Error("runWithTenant is only available in shared tenancy mode");
    }
    const client = await this.controlPlanePool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [
        tenantId,
      ]);
      await client.query("SET LOCAL ROLE tenant_role");
      const db = drizzle(client) as DrizzleDB<TSchemas>;
      const result = await fn(db);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async seedTenantDb(
    dbConfig: IsolatedTenantDbConfig,
    fn: (db: DrizzleDB<TSchemas>) => Promise<void>,
  ): Promise<void> {
    const pool = new pg.Pool({
      database: dbConfig.database,
      host: dbConfig.host,
      password: dbConfig.password,
      port: dbConfig.port,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
      user: dbConfig.user,
    });
    try {
      const db = drizzle(pool) as DrizzleDB<TSchemas>;
      await fn(db);
    } finally {
      await pool.end();
    }
  }

  async applyRlsPolicies(db: DrizzleDB<TSchemas>): Promise<void> {
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

  /** @deprecated Use provisionTenant instead */
  async createTenant(
    tenantId: string,
    options?: {
      databaseName?: string;
      host?: string;
      password?: string;
      port?: number;
      ssl?: boolean;
      user?: string;
    },
  ): Promise<IsolatedTenantDbConfig> {
    return this.provisionTenant(
      tenantId,
      options,
    ) as Promise<IsolatedTenantDbConfig>;
  }

  getSchemas() {
    return db_schemas;
  }

  protected async pushSchemasTo(
    db: DrizzleDB<TSchemas>,
    schemas: Record<string, unknown>,
  ): Promise<void> {
    const { pushSchema } = await import("drizzle-kit/api");

    // @ts-expect-error DB Type Mismatch
    const result = await pushSchema(schemas, db);
    if (result.statementsToExecute.length > 0) {
      console.log(`Applying ${result.statementsToExecute.length} Statements`);
      if (result.hasDataLoss) {
        console.warn("Schema push has data loss warnings:", result.warnings);
      }
      await result.apply();
    }
    return;
  }

  private async createTenantDatabase(
    dbConfig: IsolatedTenantDbConfig,
  ): Promise<void> {
    const adminPool = new pg.Pool({
      database: this.controlPlaneDbName ?? "postgres",
      host: this.config.host,
      password: this.config.password,
      port: this.config.port,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      user: this.config.user,
    });

    try {
      const escapedName = `"${dbConfig.database.replace(/"/g, '""')}"`;
      await adminPool.query(`CREATE DATABASE ${escapedName}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return;
      }
      throw err;
    } finally {
      await adminPool.end();
    }
  }

  private async discoverTenantTables(
    db: DrizzleDB<TSchemas>,
  ): Promise<string[]> {
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

  private createDbWrapper(): DrizzleDB<TSchemas> {
    const self = this;
    return new Proxy({} as DrizzleDB<TSchemas>, {
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
}
