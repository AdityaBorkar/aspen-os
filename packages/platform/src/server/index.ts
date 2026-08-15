import type { AuditUnit } from "#/server/audit";
import type { AuthConfig, AuthUnit } from "#/server/auth";
import type { ExtractModuleNames } from "#/server/base-platform";
import type {
  DatabaseConfig,
  DatabaseUnit,
  IsolatedTenantDbConfig,
  IsolatedTenantProvisioningResult,
  SharedTenantDbConfig,
  SharedTenantProvisioningResult,
  SingleTenantDbConfig,
  TenantDbConfig,
  TenantProvisioningResult,
} from "#/server/db";
import type { KvStoreConfig, KvStoreUnit } from "#/server/kv-store";
import type { LogConfig, LogUnit } from "#/server/log";
import type { PubSubConfig, PubSubUnit } from "#/server/pubsub";
import type { RpcConfig, RpcUnit } from "#/server/rpc";
import type { StorageConfig, StorageUnit } from "#/server/storage";

export type { AuditEntry, AuditQuery, AuditUnit, CrudAction } from "#/server/audit";
export type { AclDeclaration } from "#/server/auth";
export { defineAcl } from "#/server/auth";
export * from "#/server/db-schemas";
export { getContext } from "#/server/utils/context";
export { isGlobalTenantId } from "#/server/utils/is-global-tenant-id";
export { uuidv7 } from "#/server/utils/uuidv7";
export type {
  AuthConfig,
  AuthUnit,
  DatabaseConfig,
  DatabaseUnit,
  IsolatedTenantDbConfig,
  IsolatedTenantProvisioningResult,
  KvStoreConfig,
  KvStoreUnit,
  LogConfig,
  LogUnit,
  PubSubConfig,
  PubSubUnit,
  RpcConfig,
  RpcUnit,
  SharedTenantDbConfig,
  SharedTenantProvisioningResult,
  SingleTenantDbConfig,
  StorageConfig,
  StorageUnit,
  TenantDbConfig,
  TenantProvisioningResult,
};
export type TenancyMode = "single" | "shared" | "isolated";
export interface TenantResolver {
  resolve: (tenantId: string) => Promise<string>;
  list: () => Promise<string[]>;
}

export interface PlatformUnits<TSchemas extends Record<string, unknown> = Record<string, never>> {
  audit: AuditUnit;
  auth: AuthUnit;
  db: DatabaseUnit<TSchemas>;
  kvStore: KvStoreUnit;
  logs: LogUnit;
  pubsub: PubSubUnit;
  rpc: RpcUnit;
  storage: StorageUnit;
}

export interface ModuleInfra<
  TCP extends Record<string, unknown> = Record<string, unknown>,
  TT extends Record<string, unknown> = Record<string, unknown>,
> {
  auth: {
    acl: Record<string, readonly string[]>;
  };
  db: {
    control_plane_schemas: TCP;
    tenant_schemas: TT;
  };
  events: Record<string, Record<string, string>>;
}

export interface Unit {
  $cleanup: () => Promise<void>;
  readonly $name: string;
  $prepareInfra?: () => Promise<void>;
}

export interface Module<
  TName extends string = string,
  TCP extends Record<string, unknown> = Record<string, unknown>,
  TT extends Record<string, unknown> = Record<string, unknown>,
> {
  $cleanup: () => void | Promise<void>;
  readonly $dependencies: readonly string[];
  $initialize: (units: Record<string, Unit>) => void;
  readonly $name: TName;
  $prepareInfra: () => ModuleInfra<TCP, TT>;
  $prepareRuntime: () => void | Promise<void>;
  $prepareTenant?: (tenantId: string) => Promise<void>;
}

export type UnitAccessors<TSchemas extends Record<string, unknown> = Record<string, never>> = {
  [TKey in keyof PlatformUnits<TSchemas>]: PlatformUnits<TSchemas>[TKey];
};
export type ModuleAccessors<TModules extends Record<string, Module>> = {
  [TKey in keyof TModules]: TModules[TKey];
};

export type ArrayModuleAccessors<
  TModules extends Module[],
  Names extends TModules[number]["$name"],
> = {
  [TKey in Names]: Extract<TModules[number], { $name: TKey }>;
};

export type PlatformInstance<TModules extends Module[]> = {
  tenancyMode: TenancyMode;
  $prepareInfra: () => Promise<void>;
  $cleanup: () => Promise<void>;
  getModule: <TKey extends TModules[number]["$name"]>(
    name: TKey,
  ) => Extract<TModules[number], { $name: TKey }>;
  getUnit: <TKey extends keyof PlatformUnits>(name: TKey) => PlatformUnits[TKey];
} & UnitAccessors &
  ArrayModuleAccessors<TModules, ExtractModuleNames<TModules>[number]>;

export { BasePlatform, type CommonConfig } from "#/server/base-platform";
export {
  type IsolatedTenantConfig,
  IsolatedTenantPlatform,
  type IsolatedTenantPlatformInstance,
} from "#/server/create-isolated-tenant";
export {
  type SharedTenantConfig,
  SharedTenantPlatform,
  type SharedTenantPlatformInstance,
} from "#/server/create-shared-tenant";
export {
  type SingleTenantConfig,
  SingleTenantPlatform,
  type SingleTenantPlatformInstance,
} from "#/server/create-single-tenant";
export {
  type InferSchemaOutput,
  type RunOptions,
  type StandardSchema,
  type StepOptions,
  type StepRunner,
  Workflow,
  type WorkflowConfig,
  type WorkflowContext,
  type WorkflowInstance,
  type WorkflowRunStatus,
  WorkflowStep,
  type WorkflowStepInstance,
  type WorkflowStepStatus,
} from "#/server/workflows";
