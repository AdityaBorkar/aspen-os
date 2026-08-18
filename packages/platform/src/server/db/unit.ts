import * as db_schemas from "#/server/db/schema";
import type {
  DatabaseConfig,
  IsolatedTenantDbConfig,
  IsolatedTenantProvisioningResult,
  SharedTenantProvisioningResult,
  TenantProvisioningResult,
} from "#/server/db/types";
import type { TenancyMode, TenantResolver, SchemaMap } from "#/server/types";
import { context } from "#/server/utils";

// import { pushSchema } from "drizzle-kit/api";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Sql } from "postgres";

export type DrizzleDB<TSchemas extends SchemaMap = Record<string, never>> =
  PostgresJsDatabase<TSchemas>;

export class DatabaseUnit<TSchemas extends SchemaMap = Record<string, never>> {
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

  protected controlPlanePool: Sql;
  protected controlPlaneDbInstance: DrizzleDB<TSchemas>;
  protected storedControlPlaneSchemas: SchemaMap = {};
  protected storedTenantSchemas: SchemaMap = {};

  private readonly tenantPools = new Map<string, { db: DrizzleDB<TSchemas>; pool: Sql }>();
  private readonly dbWrapper: DrizzleDB<TSchemas>;

  constructor(config: DatabaseConfig, tenancyMode: TenancyMode) {
    this.config = config;
    this.tenancyMode = tenancyMode;
    this.resolver = config.resolver;
    this.controlPlaneDbName = config.controlPlaneDbName;
    this.tenantDbPrefix = config.tenantDbPrefix;
    this.tenantDbDefaults = config.tenantDbDefaults;

    this.controlPlanePool = postgres({
      database: config.database,
      host: config.host,
      max: config.maxConnections ?? 20,
      password: config.password,
      port: config.port,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      username: config.user,
    });
    this.controlPlaneDbInstance = drizzle<TSchemas>(this.controlPlanePool);

    this.dbWrapper = this.createDbWrapper();
  }

  get db(): DrizzleDB<TSchemas> {
    return this.dbWrapper;
  }

  get controlPlaneDb(): DrizzleDB<TSchemas> {
    return this.controlPlaneDbInstance;
  }

  get pool(): Sql {
    return this.controlPlanePool;
  }

  async $prepareInfra(controlPlaneSchemas: SchemaMap = {}, tenantSchemas: SchemaMap = {}) {
    this.storedControlPlaneSchemas = controlPlaneSchemas;
    this.storedTenantSchemas = tenantSchemas;
    const schemas = { ...this.getSchemas(), ...controlPlaneSchemas };
    await this.pushSchemasTo(this.controlPlaneDbInstance, schemas);
  }

  async prepareWithModules(
    controlPlaneSchemas: SchemaMap = {},
    tenantSchemas: SchemaMap = {},
  ): Promise<void> {
    this.storedControlPlaneSchemas = controlPlaneSchemas;
    this.storedTenantSchemas = tenantSchemas;
    const allControlPlaneSchemas = {
      ...this.getSchemas(),
      ...controlPlaneSchemas,
    };
    await this.pushSchemasTo(this.controlPlaneDbInstance, allControlPlaneSchemas);
  }

  async $cleanup() {
    await this.controlPlanePool.end();
    await Promise.all(
      [...this.tenantPools.values()].map(async ({ pool }) => {
        await pool.end();
      }),
    );
    this.tenantPools.clear();
  }

  async getTenantDb(tenantId: string): Promise<DrizzleDB<TSchemas>> {
    if (this.tenancyMode !== "isolated") {
      throw new Error("getTenantDb is only available in isolated tenancy mode");
    }

    let entry = this.tenantPools.get(tenantId);
    if (!entry) {
      const database = await this.resolver?.resolve(tenantId);
      const pool = postgres({
        database,
        host: this.tenantDbDefaults?.host ?? this.config.host,
        password: this.tenantDbDefaults?.password ?? this.config.password,
        port: this.tenantDbDefaults?.port ?? this.config.port,
        ssl:
          (this.tenantDbDefaults?.ssl ?? this.config.ssl) ? { rejectUnauthorized: false } : false,
        username: this.tenantDbDefaults?.user ?? this.config.user,
      });
      const db = drizzle<TSchemas>(pool);
      entry = { db, pool };
      this.tenantPools.set(tenantId, entry);
    }
    return entry.db;
  }

  async pushSchemasToTenant(tenantId: string, tenantSchemas: SchemaMap): Promise<void> {
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
        password: options?.password ?? this.tenantDbDefaults?.password ?? this.config.password,
        port: options?.port ?? this.tenantDbDefaults?.port ?? this.config.port,
        ssl: options?.ssl ?? this.tenantDbDefaults?.ssl ?? this.config.ssl ?? false,
        user: options?.user ?? this.tenantDbDefaults?.user ?? this.config.user,
      };

      await this.createTenantDatabase(dbConfig);

      const pool = postgres({
        database: dbConfig.database,
        host: dbConfig.host,
        password: dbConfig.password,
        port: dbConfig.port,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
        username: dbConfig.user,
      });
      const tenantDb = drizzle<TSchemas>(pool);
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

    throw new Error(`Tenant provisioning is not supported in ${this.tenancyMode} tenancy mode`);
  }

  async runWithTenant<TValue>(
    tenantId: string,
    fn: (db: DrizzleDB<TSchemas>) => TValue | Promise<TValue>,
  ): Promise<TValue> {
    if (this.tenancyMode !== "shared") {
      throw new Error("runWithTenant is only available in shared tenancy mode");
    }
    return this.controlPlaneDbInstance.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      await tx.execute(sql`SET LOCAL ROLE tenant_role`);
      // The transaction tx shares the RLS session scope established above, so fn's queries are tenant-isolated.
      return fn(tx);
    });
  }

  async seedTenantDb(
    dbConfig: IsolatedTenantDbConfig,
    fn: (db: DrizzleDB<TSchemas>) => Promise<void>,
  ): Promise<void> {
    const pool = postgres({
      database: dbConfig.database,
      host: dbConfig.host,
      password: dbConfig.password,
      port: dbConfig.port,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
      username: dbConfig.user,
    });
    try {
      const db = drizzle<TSchemas>(pool);
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
    await Promise.all(
      tableNames.map(async (tableName) => {
        await db.execute(sql`
          ALTER TABLE ${sql.identifier(tableName)} ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS tenant_isolation ON ${sql.identifier(tableName)};
          CREATE POLICY tenant_isolation ON ${sql.identifier(tableName)}
            FOR ALL TO tenant_role
            USING (tenant_id = current_setting('app.tenant_id', true))
            WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
        `);
      }),
    );
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
    const result = await this.provisionTenant(tenantId, options);
    if (result.tenancyMode !== "isolated") {
      throw new Error("createTenant requires isolated tenancy mode");
    }
    const { tenancyMode: _tenancyMode, ...dbConfig } = result;
    return dbConfig;
  }

  getSchemas() {
    return db_schemas;
  }

  protected async pushSchemasTo(db: DrizzleDB<TSchemas>, schemas: SchemaMap): Promise<void> {
    console.log({ db, schemas });
    // // @ts-expect-error DB Type Mismatch
    // const result = await pushSchema(schemas, db);
    // if (result.statementsToExecute.length > 0) {
    //   console.log(`Applying ${result.statementsToExecute.length} Statements`);
    //   if (result.hasDataLoss) {
    //     console.warn("Schema push has data loss warnings:", result.warnings);
    //   }
    //   await result.apply();
    // }
  }

  private async createTenantDatabase(dbConfig: IsolatedTenantDbConfig): Promise<void> {
    const admin = postgres({
      database: this.controlPlaneDbName ?? "postgres",
      host: this.config.host,
      password: this.config.password,
      port: this.config.port,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      username: this.config.user,
    });

    try {
      const escapedName = `"${dbConfig.database.replaceAll('"', '""')}"`;
      await admin.unsafe(`CREATE DATABASE ${escapedName}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        return;
      }
      throw error;
    } finally {
      await admin.end();
    }
  }

  private async discoverTenantTables(db: DrizzleDB<TSchemas>): Promise<string[]> {
    const rows = await db.execute(
      sql`
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'tenant_id'
          AND table_schema = 'public'
      `,
    );
    const tableNames = rows.map(
      (row) =>
        // SAFETY: information_schema.columns.table_name is always text per the SQL standard.
        row?.table_name as string,
    );
    return tableNames.filter((name) => /^[a-z_][a-z0-9_]*$/.test(name));
  }

  private createDbWrapper(): DrizzleDB<TSchemas> {
    const handler: ProxyHandler<DrizzleDB<TSchemas>> = {
      get: (_target, prop) => {
        const ctx = context.getStore();
        const realDb = ctx?.db ?? this.controlPlaneDbInstance;
        // SAFETY: proxy trap keys resolve to members of the wrapped db instance.
        const value = realDb[prop as keyof typeof realDb];
        return value instanceof Function ? value.bind(realDb) : value;
      },
    };
    return new Proxy(this.controlPlaneDbInstance, handler);
  }
}
