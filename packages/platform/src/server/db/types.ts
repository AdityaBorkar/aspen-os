import type { TenantResolver } from "#/server/types";

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
  tenantDbDefaults?: {
    host?: string;
    password?: string;
    port?: number;
    ssl?: boolean;
    user?: string;
  };
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
  controlPlaneDbName?: string;
  connection: {
    host: string;
    password: string;
    port: number;
    ssl: boolean;
    user: string;
  };
  controlDbName: string;
  pool?: {
    maxConnections?: number;
  };
  tenantDbDefaults?: {
    host?: string;
    password?: string;
    port?: number;
    ssl?: boolean;
    user?: string;
  };
  tenantDbPrefix: string;
}
