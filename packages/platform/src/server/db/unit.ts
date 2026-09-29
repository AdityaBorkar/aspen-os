import * as db_schemas from "#/server/db/schema";
import type {
  DatabaseConfig,
  IsolatedTenantDbConfig,
  IsolatedTenantProvisioningResult,
} from "#/server/db/types";
import type { TenantResolver, SchemaMap } from "#/server/types";
import { context } from "#/server/utils";

import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Sql } from "postgres";

export type DrizzleDB<TSchemas extends SchemaMap = Record<string, never>> =
  PostgresJsDatabase<TSchemas>;

export class DatabaseUnit<TSchemas extends SchemaMap = Record<string, never>> {
  readonly $name = "db";
  readonly config: DatabaseConfig;
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

  constructor(config: DatabaseConfig) {
    this.config = config;
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

  /**
   * Record the aggregated module schemas for later tenant provisioning.
   * Called eagerly at platform construction (so `provisionTenant` works in
   * any process) and again by `$prepareInfra`/`prepareWithModules`.
   */
  setStoredSchemas(controlPlaneSchemas: SchemaMap = {}, tenantSchemas: SchemaMap = {}): void {
    this.storedControlPlaneSchemas = controlPlaneSchemas;
    this.storedTenantSchemas = tenantSchemas;
  }

  async $prepareInfra(controlPlaneSchemas: SchemaMap = {}, tenantSchemas: SchemaMap = {}) {
    this.setStoredSchemas(controlPlaneSchemas, tenantSchemas);
    const schemas = { ...this.getSchemas(), ...controlPlaneSchemas };
    await this.pushSchemasTo(this.controlPlaneDbInstance, schemas);
  }

  async prepareWithModules(
    controlPlaneSchemas: SchemaMap = {},
    tenantSchemas: SchemaMap = {},
  ): Promise<void> {
    this.setStoredSchemas(controlPlaneSchemas, tenantSchemas);
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
    const database = await this.resolveDatabaseName(tenantId);
    let entry = this.tenantPools.get(database);
    if (!entry) {
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
      this.tenantPools.set(database, entry);
    }
    return entry.db;
  }

  /**
   * Single source of truth for isolated tenant database names.
   *
   * Accepts either a tenant id or an already-resolved database name
   * (idempotent: a `tenantDbPrefix_` input is returned as-is so callers
   * passing a `resolveDatabase` result into `pm.run`/`getTenantDb` never
   * double-apply the prefix). Otherwise the configured resolver wins when
   * it returns a non-empty name, falling back to the
   * `tenantDbPrefix_tenantId` convention — the same derivation
   * `provisionTenant` uses.
   */
  async resolveDatabaseName(tenantId: string): Promise<string> {
    if (this.tenantDbPrefix && tenantId.startsWith(`${this.tenantDbPrefix}_`)) {
      return tenantId;
    }
    try {
      const resolved = await this.resolver?.resolve(tenantId);
      if (resolved) {
        return resolved;
      }
    } catch {
      // Fall through to the naming convention when a custom resolver fails.
    }
    return this.tenantDbPrefix ? `${this.tenantDbPrefix}_${tenantId}` : tenantId;
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
  ): Promise<IsolatedTenantProvisioningResult> {
    const database = options?.databaseName ?? (await this.resolveDatabaseName(tenantId));

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

  getSchemas() {
    return db_schemas;
  }

  protected async pushSchemasTo(db: DrizzleDB<TSchemas>, schemas: SchemaMap): Promise<void> {
    const { pushSchema } = await import("drizzle-kit/api");

    const adapter = {
      execute: async (query: Parameters<DrizzleDB<TSchemas>["execute"]>[0]) => ({
        // SAFETY: postgres-js resolves execute() to a rows array; the cast only
        rows: (await db.execute(query)) as unknown[],
      }),
    };

    // SAFETY: pushSchema's schema type is structural (drizzle table definitions);
    // @ts-expect-error DB Type Mismatch
    const result = await pushSchema(schemas, adapter);
    if (result.statementsToExecute.length > 0) {
      console.log(`Applying ${result.statementsToExecute.length} Statements`);
      if (result.hasDataLoss) {
        console.warn("Schema push has data loss warnings:", result.warnings);
      }
      await result.apply();
    }
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
