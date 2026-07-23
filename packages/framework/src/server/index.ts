import type { AuthConfig, AuthUnit } from "./auth";
import type { DatabaseConfig, DatabaseUnit } from "./db";
import type { KvStoreConfig, KvStoreUnit } from "./kv-store";
import type { LogConfig, LogUnit } from "./log";
import type { PubSubConfig, PubSubUnit } from "./pubsub";
import type { RpcConfig, RpcUnit } from "./rpc";
import type { StorageConfig, StorageUnit } from "./storage";
export type hello = "world";
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
};
export type TenancyMode = "single" | "shared" | "isolated";
export type TenantResolver = {
  resolve: (tenantId: string) => Promise<string>;
  list: () => Promise<string[]>;
};

export type FrameworkUnits = {
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
    acl: Record<string, { allowedActions: string[] }>;
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
  [K in keyof FrameworkUnits]: FrameworkUnits[K];
};
export type ModuleAccessors<M extends Record<string, Module>> = {
  [K in keyof M]: M[K];
};

export type FrameworkInstance<M extends Record<string, Module>> = {
  tenancyMode: TenancyMode;
  prepareInfra(): Promise<void>;
  destroy(): Promise<void>;
  getModule<K extends keyof M>(name: K): M[K];
  getUnit<K extends keyof FrameworkUnits>(name: K): FrameworkUnits[K];
} & UnitAccessors &
  ModuleAccessors<M>;

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
