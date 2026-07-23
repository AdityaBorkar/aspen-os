import { type AuthConfig, AuthUnit } from "./auth";
import { context } from "./context";
import { type DatabaseConfig, DatabaseUnit } from "./db";
import type {
  FrameworkUnits,
  Module,
  ModuleAccessors,
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

export type SingleTenantPlatformInstance<M extends Record<string, Module>> =
  SingleTenantPlatform<M> & UnitAccessors & ModuleAccessors<M>;

export class SingleTenantPlatform<M extends Record<string, Module>> {
  constructor(
    private readonly units: FrameworkUnits,
    private readonly modules: M,
  ) {
    console.warn("Single Tenant Architecture is currently EXPERIMENTAL");

    // biome-ignore lint/correctness/noConstructorReturn: Exception
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          const unit = target.units[prop as keyof FrameworkUnits];
          if (unit) return unit;
        }
        if (typeof prop === "string") {
          const mod = target.modules[prop as keyof M];
          if (mod) return mod;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  static create<M extends Record<string, Module>>(
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

    const units: FrameworkUnits = {
      auth,
      db,
      kvStore,
      logs,
      pubsub,
      rpc,
      storage,
    };

    const initializedModules = {} as Record<string, Module>;
    for (const mod of Object.values(modules)) {
      mod.$initialize?.(units);
      initializedModules[mod.$name] = mod;
    }

    return new SingleTenantPlatform<M>(
      units,
      initializedModules as M,
    ) as SingleTenantPlatformInstance<M>;
  }

  get tenancyMode(): TenancyMode {
    return this.units.db.tenancyMode;
  }

  async prepareInfra(): Promise<void> {
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$prepareInfra?.();
      } catch (err) {
        console.error(`Failed to prepare unit "${unit.$name}"`, err);
      }
    }

    const mergedModuleSchemas: Record<string, unknown> = {};
    const mergedAcl: Record<string, { allowedActions: string[] }> = {};

    for (const mod of Object.values(this.modules)) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(mergedModuleSchemas, infra.db.schemas);
        for (const [resource, config] of Object.entries(infra.auth.acl)) {
          if (!mergedAcl[resource]) {
            mergedAcl[resource] = { allowedActions: [] };
          }
          mergedAcl[resource].allowedActions.push(...config.allowedActions);
        }
      }
    }

    await this.units.db.prepareWithModules(mergedModuleSchemas);
    this.units.auth.applyModuleAcl(mergedAcl);

    for await (const mod of Object.values(this.modules)) {
      try {
        await context.run(
          {
            auth: this.units.auth,
            db: this.units.db.controlPlaneDb,
            pubsub: this.units.pubsub,
          },
          () => mod.$prepareRuntime?.(),
        );
      } catch (err) {
        console.error(`Failed to prepare module "${mod.$name}"`, err);
      }
    }
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
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

  async destroy(): Promise<void> {
    for await (const mod of Object.values(this.modules)) {
      try {
        await context.run(
          {
            auth: this.units.auth,
            db: this.units.db.controlPlaneDb,
            pubsub: this.units.pubsub,
          },
          () => mod.$cleanup(),
        );
      } catch {
        console.error(`Failed to destroy module "${mod.$name}"`);
      }
    }
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$cleanup();
      } catch {
        console.error(`Failed to destroy unit "${unit.$name}"`);
      }
    }
  }

  getModule<K extends keyof M>(name: K): M[K] {
    const module = this.modules[name];
    if (!module) throw new Error(`Module "${String(name)}" not found`);
    return module;
  }

  getUnit<K extends keyof FrameworkUnits>(name: K): FrameworkUnits[K] {
    return this.units[name];
  }
}
