import type { AuthConfig, AuthUnit } from "#/server/auth";
import type {
  DatabaseConfig,
  DatabaseUnit,
  TenantDbConfig,
  TenantProvisioningResult,
} from "#/server/db";
import type { KvStoreConfig, KvStoreUnit } from "#/server/kv-store";
import type { LogConfig, LogUnit } from "#/server/log";
import type { TenantPlatformInstance } from "#/server/platform.js";
import type { PubSubConfig, PubSubUnit } from "#/server/pubsub";
import type { RpcConfig, RpcUnit } from "#/server/rpc";
import type {
  FileObject,
  FileUploadInput,
  ListOptions,
  SignedPutUrlOptions,
  SignedUrlOptions,
  StorageConfig,
  StorageProvider,
  StorageUnit,
} from "#/server/storage";
import type { Module } from "#/server/types";

export type { JsonValue, SchemaMap } from "#/server/types";
export type {
  ArrayModuleAccessors,
  ModuleAccessors,
  PlatformUnits,
  UnitAccessors,
} from "#/server/types";
export type { Module, ModuleInfra, TenantResolver, Unit } from "#/server/types";
export type { AuditUnit } from "#/server/audit";
export type { AclDeclaration } from "#/server/auth";
export { defineAcl } from "#/server/auth";
export * from "#/server/db/schema";
export { getContext, isGlobalTenantId } from "#/server/utils";
export type { Context, ContextOverrides } from "#/server/utils";
export { generateUuidv7, uuidv7 } from "#/server/db/schema/data-types";
export type {
  AuthConfig,
  AuthUnit,
  DatabaseConfig,
  DatabaseUnit,
  TenantDbConfig,
  TenantProvisioningResult,
  KvStoreConfig,
  KvStoreUnit,
  LogConfig,
  LogUnit,
  PubSubConfig,
  PubSubUnit,
  RpcConfig,
  RpcUnit,
  SignedPutUrlOptions,
  SignedUrlOptions,
  FileObject,
  FileUploadInput,
  ListOptions,
  StorageConfig,
  StorageProvider,
  StorageUnit,
};
export type PlatformInstance<TModules extends Module[]> = TenantPlatformInstance<TModules>;

export {
  type CommonConfig,
  type TenantConfig,
  TenantPlatform,
  type TenantPlatformInstance,
} from "#/server/platform.js";
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
export { context } from "#/server/utils";
export {
  EmailSchema,
  HexColorSchema,
  IdSchema,
  JsonValueSchema,
  MetadataSchema,
  NameSchema,
  ScopeTypeSchema,
  SlugSchema,
  WithIdSchema,
  type Metadata,
} from "#/server/schemas";
