export { BaseDatabaseUnit } from "./base";
export { IsolatedTenantDatabaseUnit } from "./isolated-tenant";
export { SharedTenantDatabaseUnit } from "./shared-tenant";
export { SingleTenantDatabaseUnit } from "./single-tenant";
export type {
  DatabaseConfig,
  IsolatedTenantDatabaseConfig,
  IsolatedTenantDbConfig,
  IsolatedTenantProvisioningResult,
  SharedTenantDbConfig,
  SharedTenantProvisioningResult,
  SingleTenantDbConfig,
  TenantDbConfig,
  TenantProvisioningResult,
} from "./types";

import type { IsolatedTenantDatabaseUnit } from "./isolated-tenant";
import type { SharedTenantDatabaseUnit } from "./shared-tenant";
import type { SingleTenantDatabaseUnit } from "./single-tenant";

export type DatabaseUnit =
  | SingleTenantDatabaseUnit
  | SharedTenantDatabaseUnit
  | IsolatedTenantDatabaseUnit;
