import { AuditUnit } from "#/server/audit";
import { AuthUnit } from "#/server/auth";
import type { AuthConfig } from "#/server/auth";
import type { DatabaseUnit } from "#/server/db";
import { KvStoreUnit } from "#/server/kv-store";
import type { KvStoreConfig } from "#/server/kv-store";
import { LogUnit } from "#/server/log";
import type { LogConfig } from "#/server/log";
import { PubSubUnit } from "#/server/pubsub";
import type { PubSubConfig } from "#/server/pubsub";
import { RpcUnit } from "#/server/rpc";
import type { RpcConfig } from "#/server/rpc";
import { StorageUnit } from "#/server/storage";
import type { StorageConfig } from "#/server/storage";
import type { Module, PlatformUnits, UnitAccessors, SchemaMap } from "#/server/types";
import { context, isGlobalTenantId } from "#/server/utils";

export type ExtractModuleNames<TModules extends Module[]> = {
  [TKey in keyof TModules]: TModules[TKey] extends { $name: infer TName extends string }
    ? TName
    : never;
};

export type ModuleByName<
  TModules extends Module[],
  TKey extends TModules[number]["$name"],
> = Extract<TModules[number], { $name: TKey }>;

type UnionToIntersection<TValue> = (
  TValue extends unknown ? (value: TValue) => void : never
) extends (value: infer TResult) => void
  ? TResult
  : never;

export type InferControlPlaneSchemas<TModules extends Module[]> = UnionToIntersection<
  TModules[number] extends Module<infer _N, infer TCP, infer _TT> ? TCP : never
>;

export type InferTenantSchemas<TModules extends Module[]> = UnionToIntersection<
  TModules[number] extends Module<infer _N, infer _TCP, infer TT> ? TT : never
>;

export type MergedSchemas<TModules extends Module[]> = InferControlPlaneSchemas<TModules> &
  InferTenantSchemas<TModules> &
  Record<string, never>;

/** Units + modules assembled by {@link BasePlatform.createCore}. */
export interface CoreUnits<TModules extends Module[], TSchemas extends SchemaMap> {
  modules: TModules;
  units: PlatformUnits<TSchemas>;
}

export interface CommonConfig {
  auth: AuthConfig;
  kvStore: KvStoreConfig;
  logs: LogConfig;
  pubsub: PubSubConfig;
  rpc: RpcConfig;
  storage: StorageConfig;
}

export abstract class BasePlatform<
  TModules extends Module[],
  TSchemas extends SchemaMap = MergedSchemas<TModules>,
> implements UnitAccessors<TSchemas> {
  declare readonly audit: PlatformUnits<TSchemas>["audit"];
  declare readonly auth: PlatformUnits<TSchemas>["auth"];
  declare readonly db: PlatformUnits<TSchemas>["db"];
  declare readonly kvStore: PlatformUnits<TSchemas>["kvStore"];
  declare readonly logs: PlatformUnits<TSchemas>["logs"];
  declare readonly pubsub: PlatformUnits<TSchemas>["pubsub"];
  declare readonly rpc: PlatformUnits<TSchemas>["rpc"];
  declare readonly storage: PlatformUnits<TSchemas>["storage"];

  protected readonly modules: TModules;
  protected readonly units: PlatformUnits<TSchemas>;

  constructor(units: PlatformUnits<TSchemas>, modules: TModules) {
    this.units = units;
    this.modules = modules;
    return new Proxy(this, {
      get(target, prop, _receiver) {
        if (prop in target.units) {
          // SAFETY: proxy access for a unit name resolves to the matching unit.
          return target.units[prop as keyof PlatformUnits<TSchemas>];
        }
        const mod = target.modules.find((module) => module.$name === prop);
        if (mod) {
          return mod;
        }
        // SAFETY: fall through to the wrapped platform instance's own members.
        return target[prop as keyof typeof target];
      },
    });
  }

  protected static createCore<TModules extends Module[], TSchemas extends SchemaMap>(
    db: DatabaseUnit<TSchemas>,
    config: CommonConfig,
    modules: TModules,
  ): CoreUnits<TModules, TSchemas> {
    const logs = new LogUnit(config.logs, { db });
    const audit = new AuditUnit({ db });
    const pubsub = new PubSubUnit(config.pubsub, { db });
    const auth = new AuthUnit(config.auth, { db, pubsub });
    pubsub.setAuth(auth);
    const storage = new StorageUnit(config.storage, { db });
    const kvStore = new KvStoreUnit(config.kvStore, { db });
    const rpc = new RpcUnit({ auth, db, logs, pubsub }, config.rpc);

    const units = { audit, auth, db, kvStore, logs, pubsub, rpc, storage };

    const moduleNames = new Set(modules.map((module) => module.$name));
    for (const mod of modules) {
      for (const dep of mod.$dependencies) {
        if (!moduleNames.has(dep)) {
          throw new Error(`Module "${mod.$name}" depends on "${dep}", but it was not provided`);
        }
      }
      mod.$initialize?.(units);
    }

    return { modules, units };
  }

  async $prepareInfra(): Promise<void> {
    await Promise.all(
      Object.values(this.units).map((unit) =>
        this.run("$global", () => unit.$prepareInfra?.()).catch((error) => {
          console.error(`Failed to prepare unit "${unit.$name}"`, error);
        }),
      ),
    );

    const mergedControlPlaneSchemas: SchemaMap = {};
    const mergedTenantSchemas: SchemaMap = {};
    const mergedAcl: Record<string, string[]> = {};

    for (const mod of this.modules) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(mergedControlPlaneSchemas, infra.db.control_plane_schemas);
        Object.assign(mergedTenantSchemas, infra.db.tenant_schemas);
        for (const [resource, actions] of Object.entries(infra.auth.acl)) {
          if (!mergedAcl[resource]) {
            mergedAcl[resource] = [];
          }
          mergedAcl[resource] = [...mergedAcl[resource], ...actions];
        }
      }
    }

    await this.units.db.prepareWithModules(mergedControlPlaneSchemas, mergedTenantSchemas);
    this.units.auth.applyModuleAcl(mergedAcl);

    await Promise.all(
      this.modules.map((module) =>
        this.run("$global", () => module.$prepareRuntime?.()).catch((error) => {
          console.error(`Failed to prepare module "${module.$name}"`, error);
        }),
      ),
    );
  }

  async $cleanup(): Promise<void> {
    await Promise.all(
      this.modules.map((module) =>
        this.run("$global", () => module.$cleanup()).catch((error) => {
          console.error(`Failed to destroy module "${module.$name}"`, error);
        }),
      ),
    );
    await Promise.all(
      Object.values(this.units).map(async (unit) => {
        try {
          await unit.$cleanup();
        } catch (error) {
          console.error(`Failed to destroy unit "${unit.$name}"`, error);
        }
      }),
    );
  }

  getModule<TKey extends TModules[number]["$name"]>(name: TKey): ModuleByName<TModules, TKey> {
    const mod = this.modules.find(
      (module): module is ModuleByName<TModules, TKey> => module.$name === name,
    );
    if (!mod) {
      throw new Error(`Module "${name}" not found`);
    }
    return mod;
  }

  getUnit<TKey extends keyof PlatformUnits<TSchemas>>(name: TKey): PlatformUnits<TSchemas>[TKey] {
    return this.units[name];
  }

  async run<TValue>(tenantId: string, fn: () => TValue | Promise<TValue>): Promise<TValue> {
    const ctx = {
      audit: this.units.audit,
      auth: this.units.auth,
      db: isGlobalTenantId(tenantId)
        ? this.units.db.controlPlaneDb
        : await this.units.db.getTenantDb(tenantId),
      pubsub: this.units.pubsub,
    };
    return context.run(ctx, fn);
  }
}
