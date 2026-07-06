import { type AuthConfig, type AuthUnit, createAuthUnit } from "./auth";
import * as authSchema from "./auth/db-schema";
import { context } from "./context";
import { createDrizzle, getPool } from "./db";
import { createPubSubUnit, type PubSubConfig, type PubSubUnit } from "./pubsub";
import { createRpcUnit, type RpcConfig, type RpcUnit } from "./rpc";
import { createSyncUnit, type SyncConfig, type SyncUnit } from "./sync";
import type {
  DatabaseConfig,
  Module,
  ModuleDeps,
  Unit,
  UnitDeps,
} from "./types";

export interface FrameworkConfig {
  auth: AuthConfig;
  db: DatabaseConfig;
  pubsub?: Omit<PubSubConfig, "database">;
  rpc?: RpcConfig;
  sync?: SyncConfig;
}

export class Framework {
  private config: FrameworkConfig;
  private modules: Module[] = [];
  private authUnit: (AuthUnit & Unit) | null = null;
  private pubsubUnit: (PubSubUnit & Unit) | null = null;
  private rpcUnit: (RpcUnit & Unit) | null = null;
  private syncUnit: (SyncUnit & Unit) | null = null;
  private deps: ModuleDeps | null = null;
  private initialized: boolean = false;
  private pool: import("pg").Pool | null = null;

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

    this.pool = getPool(this.config.db);
    const db = createDrizzle(
      this.pool,
      authSchema,
    ) as import("drizzle-orm/node-postgres").NodePgDatabase<
      Record<string, never>
    >;

    this.pubsubUnit = createPubSubUnit({
      database: this.config.db,
      ...this.config.pubsub,
    }) as unknown as PubSubUnit & Unit;

    this.authUnit = createAuthUnit(this.config.auth);
    this.rpcUnit = createRpcUnit(this.config.rpc);
    this.syncUnit = createSyncUnit(this.config.sync) as unknown as SyncUnit &
      Unit;

    this.deps = {
      auth: this.authUnit as unknown as AuthUnit,
      db,
      pool: this.pool,
      pubsub: this.pubsubUnit as unknown as {
        publish<T>(topic: string, data: T): Promise<string>;
      },
      rpc: this.rpcUnit as unknown as RpcUnit,
    };

    const coreUnits: Unit[] = [
      this.pubsubUnit,
      this.authUnit,
      this.rpcUnit,
      this.syncUnit,
    ].filter((u): u is Unit => u !== null);

    await context.run(
      {
        db,
        pubsub: this.pubsubUnit as unknown as {
          publish<T>(topic: string, data: T): Promise<string>;
        },
      },
      async () => {
        for (const unit of coreUnits) {
          await unit.initialize(this.deps as UnitDeps);
        }
        for (const module of this.modules) {
          await module.initialize(this.deps as ModuleDeps);
        }
      },
    );

    this.initialized = true;
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!this.initialized || !this.deps)
      throw new Error("Framework not initialized");
    return context.run(
      {
        db: this.deps.db,
        pubsub: this.deps.pubsub as unknown as {
          publish<T>(topic: string, data: T): Promise<string>;
        },
      },
      fn,
    );
  }

  async destroy(): Promise<void> {
    for (const module of this.modules) {
      try {
        await module.destroy();
      } catch {
        // Continue destroying remaining modules
      }
    }
    const coreUnits = [
      this.rpcUnit,
      this.syncUnit,
      this.authUnit,
      this.pubsubUnit,
    ];
    for (const unit of coreUnits) {
      try {
        await unit?.destroy();
      } catch {
        // Continue destroying remaining units
      }
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.deps = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    const coreUnits = [
      this.rpcUnit,
      this.syncUnit,
      this.authUnit,
      this.pubsubUnit,
    ].filter(Boolean) as Unit[];
    for (const unit of coreUnits) {
      try {
        result[unit.name] = await unit.healthCheck();
      } catch {
        result[unit.name] = false;
      }
    }
    for (const module of this.modules) {
      try {
        result[module.name] = await module.healthCheck();
      } catch {
        result[module.name] = false;
      }
    }
    return result;
  }

  get auth(): AuthUnit {
    if (!this.authUnit) throw new Error("Framework not initialized");
    return this.authUnit as unknown as AuthUnit;
  }

  get pubsub(): PubSubUnit {
    if (!this.pubsubUnit) throw new Error("Framework not initialized");
    return this.pubsubUnit as unknown as PubSubUnit;
  }

  get rpc(): RpcUnit {
    if (!this.rpcUnit) throw new Error("Framework not initialized");
    return this.rpcUnit as unknown as RpcUnit;
  }

  get sync(): SyncUnit {
    if (!this.syncUnit) throw new Error("Framework not initialized");
    return this.syncUnit as unknown as SyncUnit;
  }

  getModule<T>(name: string): T {
    if (!this.initialized) throw new Error("Framework not initialized");
    const module = this.modules.find((m) => m.name === name);
    if (!module) throw new Error(`Module "${name}" not found`);
    return module as T;
  }

  getUnits(): Unit[] {
    return [this.authUnit, this.pubsubUnit, this.rpcUnit, this.syncUnit].filter(
      Boolean,
    ) as Unit[];
  }

  getModules(): Module[] {
    return [...this.modules];
  }
}
