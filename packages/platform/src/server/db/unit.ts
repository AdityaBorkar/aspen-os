import * as db_schemas from "#/server/db/schema";
import type {
  DatabaseConfig,
  IsolatedTenantDbConfig,
  IsolatedTenantProvisioningResult,
  TenantConnectionOverrides,
} from "#/server/db/types";
import { resolveTenantConnection } from "#/server/db/types";
import type { TenantResolver, SchemaMap } from "#/server/types";
import { context } from "#/server/utils";

import { pushSchema } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Sql } from "postgres";

export type DrizzleDB<TSchemas extends SchemaMap = Record<string, never>> =
  PostgresJsDatabase<TSchemas>;

/** Bound on cached per-tenant pools; the least-recently-used entry is evicted. */
const MAX_TENANT_POOLS = 50;

function toPostgresOptions(connection: IsolatedTenantDbConfig & { maxConnections?: number }) {
  return {
    database: connection.database,
    host: connection.host,
    max: connection.maxConnections ?? 20,
    password: connection.password,
    port: connection.port,
    ssl: connection.ssl ? { rejectUnauthorized: false } : false,
    username: connection.user,
  };
}

export class DatabaseUnit<TSchemas extends SchemaMap = Record<string, never>> {
  readonly $name = "db";
  readonly config: DatabaseConfig;
  readonly resolver: TenantResolver | undefined;
  readonly tenantDbPrefix: string | undefined;
  readonly controlPlaneDbName: string | undefined;
  readonly tenantDbDefaults: DatabaseConfig["tenantDbDefaults"];

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

    this.controlPlanePool = postgres(
      toPostgresOptions({
        database: config.database,
        host: config.host,
        maxConnections: config.maxConnections,
        password: config.password,
        port: config.port,
        ssl: config.ssl ?? false,
        user: config.user,
      }),
    );
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
   * any process) and again by `$prepareInfra`. Both call sites pass the full
   * aggregation; there are no partial updates.
   */
  setStoredSchemas(controlPlaneSchemas: SchemaMap, tenantSchemas: SchemaMap): void {
    this.storedControlPlaneSchemas = controlPlaneSchemas;
    this.storedTenantSchemas = tenantSchemas;
  }

  /**
   * Push control-plane schemas. Existing tenant databases are not
   * auto-migrated here; provision new tenants via `provisionTenant` (which
   * uses the stored schemas) and migrate existing ones via
   * `pushSchemasToTenant`.
   */
  async $prepareInfra(controlPlaneSchemas: SchemaMap = {}, tenantSchemas: SchemaMap = {}) {
    this.setStoredSchemas(controlPlaneSchemas, tenantSchemas);
    const schemas = { ...this.getSchemas(), ...controlPlaneSchemas };
    await this.pushSchemasTo(this.controlPlaneDbInstance, schemas);
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
    const cached = this.tenantPools.get(database);
    if (cached) {
      this.tenantPools.delete(database);
      this.tenantPools.set(database, cached);
      return cached.db;
    }
    const connection = resolveTenantConnection(this.config, database);
    const pool = postgres(toPostgresOptions(connection));
    const db = drizzle<TSchemas>(pool);
    if (this.tenantPools.size >= MAX_TENANT_POOLS) {
      const oldest = this.tenantPools.keys().next().value;
      if (oldest !== undefined) {
        const evicted = this.tenantPools.get(oldest);
        this.tenantPools.delete(oldest);
        await evicted?.pool.end().catch(() => {});
      }
    }
    this.tenantPools.set(database, { db, pool });
    return db;
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
   * `provisionTenant` uses. Resolver failures are logged and fall back so a
   * misconfigured resolver degrades visibly instead of silently misrouting.
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
    } catch (error) {
      console.warn(
        `Tenant database resolution failed for "${tenantId}", falling back to naming convention (${error instanceof Error ? error.message : String(error)})`,
      );
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
    options?: TenantConnectionOverrides,
  ): Promise<IsolatedTenantProvisioningResult> {
    const database = options?.databaseName ?? (await this.resolveDatabaseName(tenantId));
    const dbConfig = resolveTenantConnection(this.config, database, options);

    await this.createTenantDatabase(dbConfig);

    const pool = postgres(toPostgresOptions(dbConfig));
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
    const pool = postgres(toPostgresOptions(dbConfig));
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
    const admin = postgres(
      toPostgresOptions({
        database: this.controlPlaneDbName ?? "postgres",
        host: this.config.host,
        password: this.config.password,
        port: this.config.port,
        ssl: this.config.ssl ?? false,
        user: this.config.user,
      }),
    );

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
