export type DatabaseConfig = {
  database: string;
  host: string;
  maxConnections?: number;
  password: string;
  port: number;
  ssl?: boolean;
  user: string;
};

export type TenantDbConfig = {
  database: string;
  host: string;
  password: string;
  port: number;
  ssl: boolean;
  user: string;
};

export type IsolatedTenantDatabaseConfig = {
  adminDatabase?: string;
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
};
