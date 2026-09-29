import type { TenantResolver } from "#/server/types";

/** Per-tenant connection overrides; falls back to the control-plane connection. */
export interface TenantDbDefaults {
  host?: string;
  password?: string;
  port?: number;
  ssl?: boolean;
  user?: string;
}

export interface DatabaseConfig {
  database: string;
  host: string;
  maxConnections?: number;
  password: string;
  port: number;
  ssl?: boolean;
  user: string;
  controlPlaneDbName?: string;
  resolver?: TenantResolver;
  tenantDbDefaults?: TenantDbDefaults;
  tenantDbPrefix?: string;
}

export interface IsolatedTenantDbConfig {
  database: string;
  host: string;
  password: string;
  port: number;
  ssl: boolean;
  user: string;
}

export type IsolatedTenantProvisioningResult = {
  tenancyMode: "isolated";
} & IsolatedTenantDbConfig;

export interface IsolatedTenantDatabaseConfig {
  /**
   * Admin bootstrap database used only for `CREATE DATABASE` when provisioning
   * tenants. Defaults to `"postgres"`. This is not the control-plane database.
   */
  controlPlaneDbName?: string;
  connection: {
    host: string;
    password: string;
    port: number;
    ssl: boolean;
    user: string;
  };
  /** Control-plane database name. Maps to `DatabaseConfig.database`. */
  controlDbName: string;
  pool?: {
    maxConnections?: number;
  };
  tenantDbDefaults?: TenantDbDefaults;
  tenantDbPrefix: string;
  /**
   * Tenant resolver. When omitted, the `tenantDbPrefix_tenantId` naming
   * convention is used and `list()` reports no tenants, so `$prepareInfra`
   * skips per-tenant preparation until a real resolver is provided.
   */
  resolver?: TenantResolver;
}

/** Connection overrides accepted by `provisionTenant` and related helpers. */
export interface TenantConnectionOverrides {
  databaseName?: string;
  host?: string;
  password?: string;
  port?: number;
  ssl?: boolean;
  user?: string;
}

/**
 * Default resolver used when `IsolatedTenantDatabaseConfig.resolver` is omitted.
 * Mirrors `DatabaseUnit.resolveDatabaseName` so `resolveDatabase`,
 * `provisionTenant`, and `getTenantDb` agree. `list()` is empty until a real
 * resolver is configured.
 */
export function defaultTenantResolver(prefix: string): TenantResolver {
  return {
    // SAFETY: empty list is the complete tenant set until a real resolver is configured.
    list: async () => [] as string[],
    resolve: async (tenantId: string) =>
      prefix && tenantId.startsWith(`${prefix}_`)
        ? tenantId
        : prefix
          ? `${prefix}_${tenantId}`
          : tenantId,
  };
}

/**
 * Single adapter from the user-facing isolated config to the canonical
 * `DatabaseConfig`. All field mapping lives here so `create()` never
 * hand-copies connection fields.
 */
export function toDatabaseConfig(isolated: IsolatedTenantDatabaseConfig): DatabaseConfig {
  let { resolver } = isolated;
  if (!resolver) {
    console.warn(
      "IsolatedTenantDatabaseConfig.resolver is not configured; using the " +
        "`tenantDbPrefix_tenantId` naming convention and reporting no tenants " +
        "for $prepareTenant until a resolver is provided.",
    );
    resolver = defaultTenantResolver(isolated.tenantDbPrefix);
  }
  return {
    controlPlaneDbName: isolated.controlPlaneDbName,
    database: isolated.controlDbName,
    host: isolated.connection.host,
    maxConnections: isolated.pool?.maxConnections,
    password: isolated.connection.password,
    port: isolated.connection.port,
    resolver,
    ssl: isolated.connection.ssl,
    tenantDbDefaults: isolated.tenantDbDefaults,
    tenantDbPrefix: isolated.tenantDbPrefix,
    user: isolated.connection.user,
  };
}

/**
 * Resolve the full connection for a tenant database. Single source for the
 * `tenantDbDefaults ?? control-plane ?? overrides` fallback chain used by
 * `getTenantDb`, `provisionTenant`, and the CLI.
 */
export function resolveTenantConnection(
  config: DatabaseConfig,
  database: string,
  overrides?: TenantConnectionOverrides,
): IsolatedTenantDbConfig {
  return {
    database: overrides?.databaseName ?? database,
    host: overrides?.host ?? config.tenantDbDefaults?.host ?? config.host,
    password: overrides?.password ?? config.tenantDbDefaults?.password ?? config.password,
    port: overrides?.port ?? config.tenantDbDefaults?.port ?? config.port,
    ssl: overrides?.ssl ?? config.tenantDbDefaults?.ssl ?? config.ssl ?? false,
    user: overrides?.user ?? config.tenantDbDefaults?.user ?? config.user,
  };
}
