import { type AuthConfig, AuthUnit } from "./auth";
import * as authSchema from "./auth/db-schema";
import { context } from "./context";
import { DatabaseUnit } from "./db";
import { type LoggingConfig, LoggingUnit } from "./logs";
import { createPubSubUnit, type PubSubConfig } from "./pubsub";
import { type RpcConfig, RpcUnit } from "./rpc";
import { type StorageConfig, StorageUnit } from "./storage";
import type { DatabaseConfig, Module } from "./types";

export interface FrameworkConfig {
  auth: AuthConfig;
  db: DatabaseConfig;
  logs: Omit<LoggingConfig, "database">;
  pubsub: Omit<PubSubConfig, "database">;
  rpc: RpcConfig;
  storage: Omit<StorageConfig, "database">;
}

export class Framework {
  private config: FrameworkConfig;
  private units: {
    auth: AuthUnit;
    db: DatabaseUnit;
    logs: LoggingUnit;
    pubsub: import("./pubsub").PubSubUnit;
    rpc: RpcUnit;
    storage: StorageUnit;
  } | null = null;
  private modules: Module[] = [];
  private initialized: boolean = false;

  constructor(config: FrameworkConfig) {
    this.config = config;
  }

  registerModules(modules: Module[]): this {
    if (this.initialized)
      throw new Error("Cannot register modules after initialization");
    this.modules.push(...modules);
    return this;
  }

  async initialize(): Promise<void> {
    if (this.initialized) throw new Error("Framework already initialized");

    const $config = this.config;
    const database = $config.db;

    const db = new DatabaseUnit(database);
    const pubsub = await createPubSubUnit({ database, ...$config.pubsub });

    // Create other units with pool/db from DatabaseUnit
    const storage = new StorageUnit({ database, ...$config.storage }, db.pool);
    const logs = new LoggingUnit({ database, ...$config.logs }, db.pool);
    const auth = new AuthUnit($config.auth, db.db, pubsub);
    const rpc = new RpcUnit($config.rpc);

    this.units = { auth, db, logs, pubsub, rpc, storage };

    this.initialized = true;
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!this.units) throw new Error("Could not setup framework units");
    if (!this.initialized) throw new Error("Framework not initialized");
    return context.run({ db: this.units.db.db, pubsub: this.units.pubsub }, fn);
  }

  async destroy(): Promise<void> {
    for (const module of this.modules) {
      try {
        await module.destroy();
      } catch {
        console.error(`Failed to destroy module "${module.name}"`);
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

  getModule<N extends string>(name?: N): Module | Module[] {
    if (!this.initialized) throw new Error("Framework not initialized");
    if (!name) return this.modules;
    const module = this.modules.find((m) => m.name === name);
    if (!module) throw new Error(`Module "${name}" not found`);
    return module;
  }

  getUnit(name?: keyof typeof this.units) {
    if (!this.units) throw new Error("Could not setup framework units");
    if (!this.initialized) throw new Error("Framework not initialized");
    if (!name) return this.units;
    if (!(name in this.units)) throw new Error(`Unit "${name}" not found`);
    const unit = this.units[name];
    if (!unit) throw new Error(`Unit "${name}" not initialized`);
    return unit;
  }
}
