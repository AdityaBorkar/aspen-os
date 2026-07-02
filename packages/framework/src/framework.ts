import { context } from "./lib/context";
import { closePool, getDrizzle } from "./lib/db";
import type { DatabaseConfig } from "./lib/types";
import {
  type AuthConfig,
  type AuthModule,
  createAuthModule,
} from "./modules/auth";
import * as authSchema from "./modules/auth/db-schema";
import { createPubSubModule, type PubSubModule } from "./modules/pubsub";
import { createRpcModule, type RpcModule } from "./modules/rpc";
import { createSyncModule, type SyncModule } from "./modules/sync";

export interface FrameworkConfig {
  auth: AuthConfig;
  db: DatabaseConfig;
  rpc?: import("./modules/rpc").RpcConfig;
  sync?: import("./modules/sync").SyncConfig;
}

export class Framework {
  private config: FrameworkConfig;
  private authModule: AuthModule | null = null;
  private pubsubModule: PubSubModule | null = null;
  private rpcModule: RpcModule | null = null;
  private syncModule: SyncModule | null = null;
  private initialized = false;

  constructor(config: FrameworkConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) throw new Error("Framework already initialized");

    const db = getDrizzle(this.config.db, authSchema);

    this.pubsubModule = createPubSubModule({ database: this.config.db });
    await this.pubsubModule.initialize();

    this.authModule = createAuthModule(this.config.auth);

    await context.run({ db, pubsub: this.pubsubModule }, async () => {
      await this.authModule!.register();
      this.rpcModule = createRpcModule(this.config.rpc);
      await this.rpcModule.register();
    });

    this.syncModule = createSyncModule(this.config.sync);
    await this.syncModule.initialize();

    this.initialized = true;
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!this.initialized) throw new Error("Framework not initialized");
    const db = getDrizzle(this.config.db, authSchema);
    return context.run({ db, pubsub: this.pubsubModule! }, fn);
  }

  async destroy(): Promise<void> {
    const modules = [
      this.rpcModule,
      this.syncModule,
      this.authModule,
      this.pubsubModule,
    ];
    for await (const module of modules) {
      await module?.destroy();
    }
    await closePool();
    this.initialized = false;
  }

  get auth(): AuthModule {
    if (!this.authModule) throw new Error("Framework not initialized");
    return this.authModule;
  }

  get pubsub(): PubSubModule {
    if (!this.pubsubModule) throw new Error("Framework not initialized");
    return this.pubsubModule;
  }

  get rpc(): RpcModule {
    if (!this.rpcModule) throw new Error("Framework not initialized");
    return this.rpcModule;
  }

  get sync(): SyncModule {
    if (!this.syncModule) throw new Error("Framework not initialized");
    return this.syncModule;
  }
}
