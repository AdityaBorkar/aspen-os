import type { AuditUnit } from "./audit";
import type { AuthConfig, AuthUnit } from "./auth";
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
} from "./db";
import type { KvStoreConfig, KvStoreUnit } from "./kv-store";
import type { LogConfig, LogUnit } from "./log";
import type { PubSubConfig, PubSubUnit } from "./pubsub";
import type { RpcConfig, RpcUnit } from "./rpc";
import type { StorageConfig, StorageUnit } from "./storage";

export type {
  AuditEntry,
  AuditQuery,
  AuditUnit,
  CrudAction,
} from "./audit";
export type { AclDeclaration } from "./auth";
export { defineAcl } from "./auth";
export { getContext } from "./utils/context";
export { isGlobalTenantId } from "./utils/is-global-tenant-id";
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
export type TenantResolver = {
  resolve: (tenantId: string) => Promise<string>;
  list: () => Promise<string[]>;
};

export type PlatformUnits<
  S extends Record<string, unknown> = Record<string, never>,
> = {
  audit: AuditUnit;
  auth: AuthUnit;
  db: DatabaseUnit<S>;
  kvStore: KvStoreUnit;
  logs: LogUnit;
  pubsub: PubSubUnit;
  rpc: RpcUnit;
  storage: StorageUnit;
};

export type ModuleInfra<
  TCP extends Record<string, unknown> = Record<string, unknown>,
  TT extends Record<string, unknown> = Record<string, unknown>,
> = {
  auth: {
    acl: Record<string, readonly string[]>;
  };
  db: {
    control_plane_schemas: TCP;
    tenant_schemas: TT;
  };
  events: Record<string, Record<string, string>>;
};

export interface Unit {
  $cleanup(): Promise<void>;
  readonly $name: string;
  $prepareInfra?(): Promise<void>;
}

export interface Module<
  N extends string = string,
  TCP extends Record<string, unknown> = Record<string, unknown>,
  TT extends Record<string, unknown> = Record<string, unknown>,
> {
  $cleanup(): void | Promise<void>;
  readonly $dependencies: readonly string[];
  $initialize(units: Record<string, Unit>): void;
  readonly $name: N;
  $prepareInfra(): ModuleInfra<TCP, TT>;
  $prepareRuntime(): void | Promise<void>;
  $prepareTenant?(tenantId: string): Promise<void>;
}

export type UnitAccessors = {
  [K in keyof PlatformUnits]: PlatformUnits[K];
};
export type ModuleAccessors<M extends Record<string, Module>> = {
  [K in keyof M]: M[K];
};

import type { ExtractModuleNames } from "./base-platform";

export type ArrayModuleAccessors<
  M extends Module[],
  Names extends M[number]["$name"],
> = {
  [K in Names]: Extract<M[number], { $name: K }>;
};

export type PlatformInstance<M extends Module[]> = {
  tenancyMode: TenancyMode;
  $prepareInfra(): Promise<void>;
  $cleanup(): Promise<void>;
  getModule<K extends M[number]["$name"]>(
    name: K,
  ): Extract<M[number], { $name: K }>;
  getUnit<K extends keyof PlatformUnits>(name: K): PlatformUnits[K];
} & UnitAccessors &
  ArrayModuleAccessors<M, ExtractModuleNames<M>[number]>;

export { BasePlatform, type CommonConfig } from "./base-platform";
export {
  type IsolatedTenantConfig,
  IsolatedTenantPlatform,
  type IsolatedTenantPlatformInstance,
} from "./create-isolated-tenant";
export {
  type SharedTenantConfig,
  SharedTenantPlatform,
  type SharedTenantPlatformInstance,
} from "./create-shared-tenant";
export {
  type SingleTenantConfig,
  SingleTenantPlatform,
  type SingleTenantPlatformInstance,
} from "./create-single-tenant";
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
} from "./workflows";
