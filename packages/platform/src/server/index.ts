import type { AuthConfig, AuthUnit } from "./auth";
import type { DatabaseConfig, DatabaseUnit, TenantDbConfig } from "./db";
import type { KvStoreConfig, KvStoreUnit } from "./kv-store";
import type { LogConfig, LogUnit } from "./log";
import type { PubSubConfig, PubSubUnit } from "./pubsub";
import type { RpcConfig, RpcUnit } from "./rpc";
import type { StorageConfig, StorageUnit } from "./storage";
export type hello = "world";

export type { AclDeclaration } from "./auth";
export { defineAcl } from "./auth";
export { getContext } from "./context";
export type {
  AuthConfig,
  AuthUnit,
  DatabaseConfig,
  DatabaseUnit,
  KvStoreConfig,
  KvStoreUnit,
  LogConfig,
  LogUnit,
  PubSubConfig,
  PubSubUnit,
  RpcConfig,
  RpcUnit,
  StorageConfig,
  StorageUnit,
  TenantDbConfig,
};
export type TenancyMode = "single" | "shared" | "isolated";
export type TenantResolver = {
  resolve: (tenantId: string) => Promise<string>;
  list: () => Promise<string[]>;
};

export type PlatformUnits = {
  auth: AuthUnit;
  db: DatabaseUnit;
  kvStore: KvStoreUnit;
  logs: LogUnit;
  pubsub: PubSubUnit;
  rpc: RpcUnit;
  storage: StorageUnit;
};

export type ModuleInfra = {
  auth: {
    acl: Record<string, readonly string[]>;
  };
  db: {
    schemas: Record<string, unknown>;
  };
  events: Record<string, Record<string, string>>;
};

export interface Unit {
  $cleanup(): Promise<void>;
  readonly $name: string;
  $prepareInfra?(): Promise<void>;
}

export interface Module<N extends string = string> {
  $cleanup(): void | Promise<void>;
  readonly $dependencies: readonly string[];
  $initialize(units: Record<string, Unit>): void;
  readonly $name: N;
  $prepareInfra(): ModuleInfra;
  $prepareRuntime(): void | Promise<void>;
  $prepareTenant?(tenantId: string): Promise<void>;
}

export type UnitAccessors = {
  [K in keyof PlatformUnits]: PlatformUnits[K];
};
export type ModuleAccessors<M extends Record<string, Module>> = {
  [K in keyof M]: M[K];
};

export type ArrayModuleAccessors<Names extends string> = {
  [K in Names]: Extract<Module, { $name: K }>;
};

type ExtractModuleNames<M extends Module[]> = {
  [K in keyof M]: M[K] extends { $name: infer N extends string } ? N : never;
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
  ArrayModuleAccessors<ExtractModuleNames<M>[number]>;

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
