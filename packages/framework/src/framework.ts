import { type AuthConfig, type AuthUnit, createAuthUnit } from "./auth";
import * as authSchema from "./auth/db-schema";
import { context } from "./context";
import { createDrizzle, getPool } from "./db";
import { createPubSubUnit, type PubSubConfig, type PubSubUnit } from "./pubsub";
import { createRpcUnit, type RpcConfig, type RpcUnit } from "./rpc";
import { createSyncUnit, type SyncConfig, type SyncUnit } from "./sync";
import type { DatabaseConfig, Unit, UnitDeps } from "./types";

export interface FrameworkConfig {
  auth: AuthConfig;
  db: DatabaseConfig;
  pubsub?: Omit<PubSubConfig, "database">;
  rpc?: RpcConfig;
  sync?: SyncConfig;
}

export class Framework {
  private config: FrameworkConfig;
  private extraUnits: Unit[] = [];
  private authUnit: (AuthUnit & Unit) | null = null;
  private pubsubUnit: (PubSubUnit & Unit) | null = null;
  private rpcUnit: (RpcUnit & Unit) | null = null;
  private syncUnit: (SyncUnit & Unit) | null = null;
  private deps: UnitDeps | null = null;
  private initialized = false;
  private pool: import("pg").Pool | null = null;

  constructor(config: FrameworkConfig) {
    this.config = config;
  }

  register(modules: Unit[]): this {
    if (this.initialized)
      throw new Error("Cannot register units after initialization");
    this.extraUnits.push(...modules);
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
    }) as any;

    this.authUnit = createAuthUnit(this.config.auth) as any;
    this.rpcUnit = createRpcUnit(this.config.rpc) as any;
    this.syncUnit = createSyncUnit(this.config.sync) as any;

    this.deps = {
      db,
      pool: this.pool,
      pubsub: this.pubsubUnit as unknown as {
        publish<T>(topic: string, data: T): Promise<string>;
      },
    };

    const coreUnits: Unit[] = [
      this.pubsubUnit!,
      this.authUnit!,
      this.rpcUnit!,
      this.syncUnit!,
    ];

    await context.run({ db, pubsub: this.pubsubUnit as any }, async () => {
      for (const unit of coreUnits) {
        await unit.initialize(this.deps!);
      }
      for (const unit of this.extraUnits) {
        await unit.initialize(this.deps!);
      }
    });

    this.initialized = true;
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!this.initialized || !this.deps)
      throw new Error("Framework not initialized");
    return context.run(
      { db: this.deps.db, pubsub: this.deps.pubsub as any },
      fn,
    );
  }

  async destroy(): Promise<void> {
    const allUnits = [
      ...this.extraUnits,
      this.rpcUnit,
      this.syncUnit,
      this.authUnit,
      this.pubsubUnit,
    ];
    for (const unit of allUnits) {
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
    const allUnits = [
      ...this.extraUnits,
      this.rpcUnit,
      this.syncUnit,
      this.authUnit,
      this.pubsubUnit,
    ].filter(Boolean) as Unit[];
    for (const unit of allUnits) {
      try {
        result[unit.name] = await unit.healthCheck();
      } catch {
        result[unit.name] = false;
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

  getUnit<T extends Unit>(name: string): T | undefined {
    return [
      this.authUnit,
      this.pubsubUnit,
      this.rpcUnit,
      this.syncUnit,
      ...this.extraUnits,
    ].find((u) => u?.name === name) as T | undefined;
  }
}
