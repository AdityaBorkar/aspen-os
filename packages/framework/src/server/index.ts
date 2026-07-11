import { type AuthConfig, AuthUnit } from "./auth";
import { context } from "./context";
import { type DatabaseConfig, DatabaseUnit } from "./db";
import { type KvStoreConfig, KvStoreUnit } from "./kv-store";
import { type LogConfig, LogUnit } from "./log";
import { type PubSubConfig, PubSubUnit } from "./pubsub";
import { type RpcConfig, RpcUnit } from "./rpc";
import { type StorageConfig, StorageUnit } from "./storage";

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

export type FrameworkConfig = {
  auth: AuthConfig;
  db: DatabaseConfig;
  kvStore: KvStoreConfig;
  logs: LogConfig;
  pubsub: PubSubConfig;
  rpc: RpcConfig;
  storage: StorageConfig;
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

export interface Unit {
  $destroy(): Promise<void>;
  readonly $name: string;
  $prepare?(): Promise<void>;
}

export interface Module<N extends string = string> {
  destroy(): Promise<void>;
  initialize?(units: Record<string, Unit>): void;
  readonly name: N;
  prepare?(): Promise<void>;
}

type UnitAccessors = { [K in keyof FrameworkUnits]: FrameworkUnits[K] };
type ModuleAccessors<M extends Record<string, Module>> = {
  [K in keyof M]: M[K];
};

export type FrameworkInstance<M extends Record<string, Module>> = Framework<M> &
  UnitAccessors &
  ModuleAccessors<M>;

export class Framework<M extends Record<string, Module>> {
  constructor(
    private readonly units: FrameworkUnits,
    private readonly modules: M,
  ) {
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
    config: FrameworkConfig,
    modules: M,
  ): FrameworkInstance<M> {
    const db = new DatabaseUnit(config.db);
    const logs = new LogUnit(config.logs, { db });
    const pubsub = new PubSubUnit(config.pubsub, { db });
    const storage = new StorageUnit(config.storage, { db });
    const auth = new AuthUnit(config.auth, { db });
    const rpc = new RpcUnit(config.rpc, { auth, db, logs, pubsub });
    const kvStore = new KvStoreUnit(config.kvStore, { db });

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
      mod.initialize?.(units);
      initializedModules[mod.name] = mod;
    }

    return new Framework<M>(
      units,
      initializedModules as M,
    ) as FrameworkInstance<M>;
  }

  async prepare(): Promise<void> {
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$prepare?.();
      } catch (err) {
        console.error(`Failed to prepare unit "${unit.$name}"`, err);
      }
    }
    for await (const mod of Object.values(this.modules)) {
      try {
        await mod.prepare?.();
      } catch (err) {
        console.error(`Failed to prepare module "${mod.name}"`, err);
      }
    }
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    return context.run({ db: this.units.db.db, pubsub: this.units.pubsub }, fn);
  }

  async destroy(): Promise<void> {
    for await (const mod of Object.values(this.modules)) {
      try {
        await mod.destroy();
      } catch {
        console.error(`Failed to destroy module "${mod.name}"`);
      }
    }
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$destroy();
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
