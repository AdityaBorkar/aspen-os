import { type AuthConfig, type AuthUnit, createAuthUnit } from "./auth";
import * as authSchema from "./auth/db-schema";
import { context } from "./context";
import { createDrizzle, getPool } from "./db";
import { createLogQueryService } from "./logs/service";
import { createPubSubUnit, type PubSubConfig, type PubSubUnit } from "./pubsub";
import { createRpcUnit, type RpcConfig, type RpcUnit } from "./rpc";
import { createStorageUnit, type StorageUnit } from "./storage";
import type { DatabaseConfig, Module, Unit } from "./types";

export interface FrameworkConfig {
  auth: AuthConfig;
  db: DatabaseConfig;
  pubsub?: Omit<PubSubConfig, "database">;
  rpc?: RpcConfig;
}

export class Framework {
  private config: FrameworkConfig;
  private units: {
    auth: (AuthUnit & Unit) | null;
    pubsub: (PubSubUnit & Unit) | null;
    rpc: (RpcUnit & Unit) | null;
    workflows: (WorkflowUnit & Unit) | null;
    storage: StorageUnit | null;
    logs: LogQueryService | null;
    db: AuthConfig | null;
  } = {
    auth: null,
    db: null,
    logs: null,
    pubsub: null,
    rpc: null,
    storage: null,
    workflows: null,
  };
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

    this.units.logs = createLogQueryService();
    this.units.db = createDrizzle(getPool(this.config.db), authSchema);
    this.units.pubsub = createPubSubUnit({
      database: this.config.db,
      ...this.config.pubsub,
    }) as unknown as PubSubUnit & Unit;
    this.units.auth = createAuthUnit(this.config.auth);
    this.units.rpc = createRpcUnit(this.config.rpc);
    this.units.storage = createStorageUnit();
    this.units.workflows = createWorkflowUnit();

    await context.run(this.units, async () => {
      for (const module of this.modules) {
        await module.initialize(this.units);
      }
    });

    this.initialized = true;
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!this.initialized) throw new Error("Framework not initialized");
    return context.run(this.units, fn);
  }

  async destroy(): Promise<void> {
    for (const module of this.modules) {
      try {
        await module.destroy();
      } catch {
        console.error(`Failed to destroy unit "${module.name}"`);
      }
    }
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

  getUnit(name?: keyof typeof this.units): Unit | typeof this.units {
    if (!this.initialized) throw new Error("Framework not initialized");
    if (!name) return this.units;
    if (!(name in this.units)) throw new Error(`Unit "${name}" not found`);
    const unit = this.units[name];
    if (!unit) throw new Error(`Unit "${name}" not initialized`);
    return unit;
  }
}
