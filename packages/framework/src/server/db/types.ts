export type DatabaseConfig = {
  database: string;
  host: string;
  maxConnections?: number;
  password: string;
  port: number;
  ssl?: boolean;
  user: string;
};

export type IsolatedTenantDatabaseConfig = {
  controlDbName: string;
  tenantDbPrefix: string;
  pool?: {
    maxConnections?: number;
  };
  connection: {
    host: string;
    password: string;
    port: number;
    ssl: boolean;
    user: string;
  };
};
