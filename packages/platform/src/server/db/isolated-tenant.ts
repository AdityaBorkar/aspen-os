import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import type { TenantResolver } from "../index";
import { BaseDatabaseUnit } from "./base";
import type {
  DatabaseConfig,
  IsolatedTenantDbConfig,
  IsolatedTenantProvisioningResult,
} from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export class IsolatedTenantDatabaseUnit extends BaseDatabaseUnit {
  override readonly resolver: TenantResolver;
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

  private readonly tenantPools: Map<string, { db: DrizzleDB; pool: pg.Pool }> =
    new Map();

  constructor(
    config: DatabaseConfig,
    options: {
      resolver: TenantResolver;
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
    super(config, "isolated");
    this.resolver = options.resolver;
    this.controlPlaneDbName = options.controlPlaneDbName;
    this.tenantDbPrefix = options.tenantDbPrefix;
    this.tenantDbDefaults = options.tenantDbDefaults;
  }

  override async $cleanup() {
    await super.$cleanup();
    for (const { pool } of this.tenantPools.values()) {
      await pool.end();
    }
    this.tenantPools.clear();
  }

  override async getTenantDb(tenantId: string): Promise<DrizzleDB> {
    let entry = this.tenantPools.get(tenantId);
    if (!entry) {
      const database = await this.resolver.resolve(tenantId);
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
      const db = drizzle(pool);
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

  override async provisionTenant(
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
        options?.ssl ?? this.tenantDbDefaults?.ssl ?? this.config.ssl ?? false,
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
    const tenantDb = drizzle(pool);
    try {
      const allTenantSchemas = {
        ...this.getSchemas(),
        ...this.storedTenantSchemas,
      };
      await this.pushSchemasTo(tenantDb, allTenantSchemas);
    } finally {
      await pool.end();
    }

    return { tenancyMode: "isolated", ...dbConfig };
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
    return this.provisionTenant(tenantId, options);
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
}
