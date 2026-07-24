import { type AuthConfig, AuthUnit } from "./auth";
import { context } from "./context";
import { type DatabaseConfig, DatabaseUnit } from "./db";
import type {
  ArrayModuleAccessors,
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

export type SingleTenantConfig = {
  auth: AuthConfig;
  db: DatabaseConfig;
  kvStore: KvStoreConfig;
  logs: LogConfig;
  pubsub: PubSubConfig;
  rpc: RpcConfig;
  storage: StorageConfig;
};

type ExtractModuleNames<M extends Module[]> = {
  [K in keyof M]: M[K] extends { $name: infer N extends string } ? N : never;
};

export type SingleTenantPlatformInstance<M extends Module[]> =
  SingleTenantPlatform<M> &
    UnitAccessors &
    ArrayModuleAccessors<ExtractModuleNames<M>[number]>;

export class SingleTenantPlatform<M extends Module[]> {
  constructor(
    private readonly units: PlatformUnits,
    private readonly modules: M,
  ) {
    console.warn("Single Tenant Architecture is currently EXPERIMENTAL");

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
    });
  }

  static create<M extends Module[]>(
    config: SingleTenantConfig,
    modules: M,
  ): SingleTenantPlatformInstance<M> {
    const db = new DatabaseUnit(config.db, { mode: "single" });
    const logs = new LogUnit(config.logs, { db });
    const pubsub = new PubSubUnit(config.pubsub, { db });
    const auth = new AuthUnit(config.auth, { db });
    pubsub.setAuth(auth);
    auth.setPubSub(pubsub);
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

    return new SingleTenantPlatform<M>(
      units,
      modules,
    ) as SingleTenantPlatformInstance<M>;
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

    const mergedModuleSchemas: Record<string, unknown> = {};
    const mergedAcl: Record<string, string[]> = {};

    for (const mod of this.modules) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(mergedModuleSchemas, infra.db.schemas);
        for (const [resource, actions] of Object.entries(infra.auth.acl)) {
          if (!mergedAcl[resource]) {
            mergedAcl[resource] = [];
          }
          mergedAcl[resource].push(...(actions as string[]));
        }
      }
    }

    await this.units.db.prepareWithModules(mergedModuleSchemas);
    this.units.auth.applyModuleAcl(mergedAcl);

    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$prepareRuntime?.());
      } catch (err) {
        console.error(`Failed to prepare module "${mod.$name}"`, err);
      }
    }
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    return this.runInContext(fn);
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

  getModule<K extends M[number]["$name"]>(
    name: K,
  ): Extract<M[number], { $name: K }> {
    const mod = this.modules.find((m) => m.$name === name);
    if (!mod) throw new Error(`Module "${String(name)}" not found`);
    return mod as Extract<M[number], { $name: K }>;
  }

  getUnit<K extends keyof PlatformUnits>(name: K): PlatformUnits[K] {
    return this.units[name];
  }

  private runInContext<T>(fn: () => T | Promise<T>): T | Promise<T> {
    return context.run(
      {
        auth: this.units.auth,
        db: this.units.db.controlPlaneDb,
        kvStore: null,
        log: null,
        pubsub: this.units.pubsub,
        rpc: null,
        storage: null,
        workflows: null,
      },
      fn,
    );
  }
}
