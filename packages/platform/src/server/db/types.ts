export type DatabaseConfig = {
  database: string;
  host: string;
  maxConnections?: number;
  password: string;
  port: number;
  ssl?: boolean;
  user: string;
};

export type IsolatedTenantDbConfig = {
  database: string;
  host: string;
  password: string;
  port: number;
  ssl: boolean;
  user: string;
};

export type SharedTenantDbConfig = {
  tenantId: string;
};

export type SingleTenantDbConfig = Record<string, never>;

/** @deprecated Use IsolatedTenantDbConfig instead */
export type TenantDbConfig = IsolatedTenantDbConfig;

export type IsolatedTenantProvisioningResult = {
  tenancyMode: "isolated";
} & IsolatedTenantDbConfig;

export type SharedTenantProvisioningResult = {
  tenancyMode: "shared";
} & SharedTenantDbConfig;

export type TenantProvisioningResult =
  | IsolatedTenantProvisioningResult
  | SharedTenantProvisioningResult;

export type IsolatedTenantDatabaseConfig = {
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
};
