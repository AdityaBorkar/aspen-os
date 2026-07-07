import { type AuthConfig, AuthUnit } from "./auth";
import { context } from "./context";
import { DatabaseUnit } from "./db";
import { type KvStoreConfig, KvStoreUnit } from "./kv-store";
import { type LoggingConfig, LoggingUnit } from "./logs";
import { type PubSubConfig, PubSubUnit } from "./pubsub";
import { type RpcConfig, RpcUnit } from "./rpc";
import { type StorageConfig, StorageUnit } from "./storage";
import type { DatabaseConfig, Module } from "./types";

export interface FrameworkConfig {
  auth: AuthConfig;
  db: DatabaseConfig;
  kvStore: KvStoreConfig;
  logs: LoggingConfig;
  pubsub: PubSubConfig;
  rpc: RpcConfig;
  storage: StorageConfig;
}

type Units = {
  auth: AuthUnit;
  db: DatabaseUnit;
  logs: LoggingUnit;
  pubsub: PubSubUnit;
  rpc: RpcUnit;
  storage: StorageUnit;
  kvStore: KvStoreUnit;
};

export class Framework {
  private config: FrameworkConfig;
  private units: Units | null = null;
  private modules: Record<string, Module> = {};
  private initialized: boolean = false;

  constructor(config: FrameworkConfig) {
    this.config = config;
  }

  registerModule(module: Module) {
    if (this.initialized)
      throw new Error("Cannot register module after initialization");
    this.modules[module.name] = module;
  }

  async initialize(): Promise<void> {
    if (this.initialized) throw new Error("Framework already initialized");

    const $config = this.config;
    const db = new DatabaseUnit($config.db);
    const logs = new LoggingUnit($config.logs, { db });
    const pubsub = new PubSubUnit($config.pubsub, { db });
    const storage = new StorageUnit($config.storage, { db });
    const auth = new AuthUnit($config.auth, { db, logs, pubsub });
    const rpc = new RpcUnit($config.rpc, { auth, db, logs, pubsub });
    const kvStore = new KvStoreUnit($config.kvStore, { db });

    this.units = { auth, db, kvStore, logs, pubsub, rpc, storage };
    this.initialized = true;

    // for await (const module of this.modules) {
    //   module.initialize(this.units);
    // }
  }

  async prepare(): Promise<void> {
    if (!this.initialized) throw new Error("Framework not initialized");
    if (!this.units) throw new Error("Could not setup framework units");

    for await (const [name, unit] of Object.entries(this.units)) {
      try {
        await unit?.prepare();
      } catch (err) {
        console.error(`Failed to prepare unit "${name}"`, err);
      }
    }

    // for await (const module of this.modules) {
    //   module.prepare(this.units);
    // }
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!this.units) throw new Error("Could not setup framework units");
    if (!this.initialized) throw new Error("Framework not initialized");
    return context.run({ db: this.units.db.db, pubsub: this.units.pubsub }, fn);
  }

  async destroy(): Promise<void> {
    for await (const [name, module] of Object.entries(this.modules)) {
      try {
        await module?.destroy();
      } catch {
        console.error(`Failed to destroy module "${name}"`);
      }
    }

    if (!this.units) throw new Error("Could not setup framework units");
    for await (const [name, unit] of Object.entries(this.units)) {
      try {
        await unit?.destroy();
      } catch {
        console.error(`Failed to destroy unit "${name}"`);
      }
    }
    this.initialized = false;
  }

  getModule<N extends keyof typeof this.modules>(name?: N) {
    if (!this.initialized) throw new Error("Framework not initialized");

    if (!name) return this.modules;
    if (!(name in this.modules)) throw new Error(`Unit "${name}" not found`);
    const unit = this.modules[name];
    if (!unit) throw new Error(`Unit "${name}" not initialized`);
    return unit;
  }

  getUnit(name?: keyof Units) {
    if (!this.units) throw new Error("Could not setup framework units");
    if (!this.initialized) throw new Error("Framework not initialized");

    if (!name) return this.units;
    if (!(name in this.units)) throw new Error(`Unit "${name}" not found`);
    const unit = this.units[name];
    if (!unit) throw new Error(`Unit "${name}" not initialized`);
    return unit;
  }
}
