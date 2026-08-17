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
  TenantProvisioningResult,
} from "#/server/db";
import type { KvStoreConfig, KvStoreUnit } from "#/server/kv-store";
import type { LogConfig, LogUnit } from "#/server/log";
import type { PubSubConfig, PubSubUnit } from "#/server/pubsub";
import type { RpcConfig, RpcUnit } from "#/server/rpc";
import type { StorageConfig, StorageUnit } from "#/server/storage";
import type {
  Module,
  TenancyMode,
  ArrayModuleAccessors,
  PlatformUnits,
  UnitAccessors,
} from "#/server/types";

export type { JsonValue, SchemaMap } from "#/server/types";
export type {
  ArrayModuleAccessors,
  ModuleAccessors,
  PlatformUnits,
  UnitAccessors,
} from "#/server/types";
export type { Module, ModuleInfra, TenantResolver, TenancyMode, Unit } from "#/server/types";
export type { AuditUnit } from "#/server/audit";
export type { AclDeclaration } from "#/server/auth";
export { defineAcl } from "#/server/auth";
export * from "#/server/db/schema";
export { getContext, isGlobalTenantId, password } from "#/server/utils";
export { generateUuidv7, uuidv7 } from "#/server/db/schema/data-types";
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
  TenantProvisioningResult,
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
