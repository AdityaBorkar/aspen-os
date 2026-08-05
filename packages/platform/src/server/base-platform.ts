import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { type AuthConfig, AuthUnit } from "./auth";
import type { DatabaseUnit } from "./db";
import type {
  Module,
  PlatformUnits,
  TenancyMode,
  UnitAccessors,
} from "./index";
import { type KvStoreConfig, KvStoreUnit } from "./kv-store";
import { type LogConfig, LogUnit } from "./log";
import { type PubSubConfig, PubSubUnit } from "./pubsub";
import { type RpcConfig, RpcUnit } from "./rpc";
import { type StorageConfig, StorageUnit } from "./storage";
import { context } from "./utils/context";

export type ExtractModuleNames<M extends Module[]> = {
  [K in keyof M]: M[K] extends { $name: infer N extends string } ? N : never;
};

export type ModuleByName<
  M extends Module[],
  K extends M[number]["$name"],
> = Extract<M[number], { $name: K }>;

export type CommonConfig = {
  auth: AuthConfig;
  kvStore: KvStoreConfig;
  logs: LogConfig;
  pubsub: PubSubConfig;
  rpc: RpcConfig;
  storage: StorageConfig;
};

export abstract class BasePlatform<M extends Module[]>
  implements UnitAccessors
{
  declare readonly auth: PlatformUnits["auth"];
  declare readonly db: PlatformUnits["db"];
  declare readonly kvStore: PlatformUnits["kvStore"];
  declare readonly logs: PlatformUnits["logs"];
  declare readonly pubsub: PlatformUnits["pubsub"];
  declare readonly rpc: PlatformUnits["rpc"];
  declare readonly storage: PlatformUnits["storage"];

  constructor(
    protected readonly units: PlatformUnits,
    protected readonly modules: M,
  ) {
    // biome-ignore lint/correctness/noConstructorReturn: Exception
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          const unit = target.units[prop as keyof PlatformUnits];
          if (unit) return unit;
          const mod = target.modules.find((m) => m.$name === prop);
          if (mod) return mod;
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as this &
      PlatformUnits & {
        [K in M[number]["$name"]]: Extract<M[number], { $name: K }>;
      };
  }

  protected static createCore<M extends Module[]>(
    db: DatabaseUnit,
    config: CommonConfig,
    modules: M,
  ): { units: PlatformUnits; modules: M } {
    const logs = new LogUnit(config.logs, { db });
    const pubsub = new PubSubUnit(config.pubsub, { db });
    const auth = new AuthUnit(config.auth, { db, pubsub });
    pubsub.setAuth(auth);
    const storage = new StorageUnit(config.storage, { db });
    const kvStore = new KvStoreUnit(config.kvStore, { db });
    const rpc = new RpcUnit(config.rpc, { auth, db, logs, pubsub });

    const units = { auth, db, kvStore, logs, pubsub, rpc, storage };

    const moduleNames = new Set(modules.map((m) => m.$name));
    for (const mod of modules) {
      for (const dep of mod.$dependencies) {
        if (!moduleNames.has(dep)) {
          throw new Error(
            `Module "${mod.$name}" depends on "${dep}", but it was not provided`,
          );
        }
      }
      mod.$initialize?.(units);
    }

    return { modules, units };
  }

  get tenancyMode(): TenancyMode {
    return this.units.db.tenancyMode;
  }

  async $prepareInfra(): Promise<void> {
    for (const unit of Object.values(this.units)) {
      try {
        await unit.$prepareInfra?.();
      } catch (err) {
        console.error(`Failed to prepare unit "${unit.$name}"`, err);
      }
    }

    const mergedControlPlaneSchemas: Record<string, unknown> = {};
    const mergedTenantSchemas: Record<string, unknown> = {};
    const mergedAcl: Record<string, string[]> = {};

    for (const mod of this.modules) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(
          mergedControlPlaneSchemas,
          infra.db.control_plane_schemas,
        );
        Object.assign(mergedTenantSchemas, infra.db.tenant_schemas);
        for (const [resource, actions] of Object.entries(infra.auth.acl)) {
          if (!mergedAcl[resource]) {
            mergedAcl[resource] = [];
          }
          mergedAcl[resource].push(...(actions as string[]));
        }
      }
    }

    await this.units.db.prepareWithModules(
      mergedControlPlaneSchemas,
      mergedTenantSchemas,
    );
    this.units.auth.applyModuleAcl(mergedAcl);

    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$prepareRuntime?.());
      } catch (err) {
        console.error(`Failed to prepare module "${mod.$name}"`, err);
      }
    }
  }

  async $cleanup(): Promise<void> {
    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$cleanup());
      } catch {
        console.error(`Failed to destroy module "${mod.$name}"`);
      }
    }
    for (const unit of Object.values(this.units)) {
      try {
        await unit.$cleanup();
      } catch {
        console.error(`Failed to destroy unit "${unit.$name}"`);
      }
    }
  }

  getModule<K extends M[number]["$name"]>(name: K): ModuleByName<M, K> {
    const mod = this.modules.find((m) => m.$name === name);
    if (!mod) throw new Error(`Module "${String(name)}" not found`);
    return mod as ModuleByName<M, K>;
  }

  getUnit<K extends keyof PlatformUnits>(name: K): PlatformUnits[K] {
    return this.units[name];
  }

  protected runInContext<T>(
    fn: () => T | Promise<T>,
    overrides?: {
      db?: NodePgDatabase<Record<string, never>>;
      tenantId?: string;
    },
  ): T | Promise<T> {
    const ctx = {
      auth: this.units.auth,
      db: this.units.db.controlPlaneDb,
      pubsub: this.units.pubsub,
      ...overrides,
    };
    return context.run(ctx, fn);
  }
}
