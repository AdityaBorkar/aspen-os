import type { AuditUnit } from "#/server/audit";
import type { AuthUnit } from "#/server/auth";
import type { DatabaseUnit } from "#/server/db";
import type { KvStoreUnit } from "#/server/kv-store";
import type { LogUnit } from "#/server/log";
import type { PubSubUnit } from "#/server/pubsub";
import type { RpcUnit } from "#/server/rpc";
import type { StorageUnit } from "#/server/storage";

import type { PgTable } from "drizzle-orm/pg-core";
import type { Relations } from "drizzle-orm/relations";

export type SchemaMap = Record<string, PgTable | Relations>;

export type JsonValue =
  | boolean
  | number
  | string
  | null
  | undefined
  | Date
  | JsonValue[]
  | { [key: string]: JsonValue };

export type TenancyMode = "single" | "shared" | "isolated";

export interface TenantResolver {
  resolve: (tenantId: string) => Promise<string>;
  list: () => Promise<string[]>;
}

export interface ModuleInfra<TCP extends SchemaMap = SchemaMap, TT extends SchemaMap = SchemaMap> {
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
  TCP extends SchemaMap = SchemaMap,
  TT extends SchemaMap = SchemaMap,
> {
  $cleanup: () => void | Promise<void>;
  readonly $dependencies: readonly string[];
  /** Each module types the subset of units it depends on (see $dependencies). */
  $initialize: (units: any) => void;
  readonly $name: TName;
  $prepareInfra: () => ModuleInfra<TCP, TT>;
  $prepareRuntime: () => void | Promise<void>;
  $prepareTenant?: (tenantId: string) => Promise<void>;
}

export interface PlatformUnits<TSchemas extends SchemaMap = Record<string, never>> {
  audit: AuditUnit;
  auth: AuthUnit;
  db: DatabaseUnit<TSchemas>;
  kvStore: KvStoreUnit;
  logs: LogUnit;
  pubsub: PubSubUnit;
  rpc: RpcUnit;
  storage: StorageUnit;
}

export type UnitAccessors<TSchemas extends SchemaMap = Record<string, never>> = {
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
