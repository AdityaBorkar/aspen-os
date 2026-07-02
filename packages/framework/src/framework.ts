import { type AuthConfig, type AuthModule, createAuthModule } from "./auth";
import * as authSchema from "./auth/db-schema";
import { context } from "./context";
import { createDrizzle, getPool } from "./db";
import {
  createPubSubModule,
  type PubSubConfig,
  type PubSubModule,
} from "./pubsub";
import { createRpcModule, type RpcConfig, type RpcModule } from "./rpc";
import { createSyncModule, type SyncConfig, type SyncModule } from "./sync";
import type { DatabaseConfig, Module, ModuleDeps } from "./types";

export interface FrameworkConfig {
  auth: AuthConfig;
  db: DatabaseConfig;
  pubsub?: Omit<PubSubConfig, "database">;
  rpc?: RpcConfig;
  sync?: SyncConfig;
}

export class Framework {
  private config: FrameworkConfig;
  private extraModules: Module[] = [];
  private authModule: (AuthModule & Module) | null = null;
  private pubsubModule: (PubSubModule & Module) | null = null;
  private rpcModule: (RpcModule & Module) | null = null;
  private syncModule: (SyncModule & Module) | null = null;
  private deps: ModuleDeps | null = null;
  private initialized = false;
  private pool: import("pg").Pool | null = null;

  constructor(config: FrameworkConfig) {
    this.config = config;
  }

  register(modules: Module[]): this {
    if (this.initialized)
      throw new Error("Cannot register modules after initialization");
    this.extraModules.push(...modules);
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

    this.pubsubModule = createPubSubModule({
      database: this.config.db,
      ...this.config.pubsub,
    }) as any;

    this.authModule = createAuthModule(this.config.auth) as any;
    this.rpcModule = createRpcModule(this.config.rpc) as any;
    this.syncModule = createSyncModule(this.config.sync) as any;

    this.deps = {
      db,
      pool: this.pool,
      pubsub: this.pubsubModule as unknown as {
        publish<T>(topic: string, data: T): Promise<string>;
      },
    };

    const coreModules: Module[] = [
      this.pubsubModule!,
      this.authModule!,
      this.rpcModule!,
      this.syncModule!,
    ];

    await context.run({ db, pubsub: this.pubsubModule as any }, async () => {
      for (const mod of coreModules) {
        await mod.initialize(this.deps!);
      }
      for (const mod of this.extraModules) {
        await mod.initialize(this.deps!);
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
    const allModules = [
      ...this.extraModules,
      this.rpcModule,
      this.syncModule,
      this.authModule,
      this.pubsubModule,
    ];
    for (const mod of allModules) {
      try {
        await mod?.destroy();
      } catch {
        // Continue destroying remaining modules
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
    const allModules = [
      ...this.extraModules,
      this.rpcModule,
      this.syncModule,
      this.authModule,
      this.pubsubModule,
    ].filter(Boolean) as Module[];
    for (const mod of allModules) {
      try {
        result[mod.name] = await mod.healthCheck();
      } catch {
        result[mod.name] = false;
      }
    }
    return result;
  }

  get auth(): AuthModule {
    if (!this.authModule) throw new Error("Framework not initialized");
    return this.authModule as unknown as AuthModule;
  }

  get pubsub(): PubSubModule {
    if (!this.pubsubModule) throw new Error("Framework not initialized");
    return this.pubsubModule as unknown as PubSubModule;
  }

  get rpc(): RpcModule {
    if (!this.rpcModule) throw new Error("Framework not initialized");
    return this.rpcModule as unknown as RpcModule;
  }

  get sync(): SyncModule {
    if (!this.syncModule) throw new Error("Framework not initialized");
    return this.syncModule as unknown as SyncModule;
  }

  getModule<T extends Module>(name: string): T | undefined {
    return [
      this.authModule,
      this.pubsubModule,
      this.rpcModule,
      this.syncModule,
      ...this.extraModules,
    ].find((m) => m?.name === name) as T | undefined;
  }
}
