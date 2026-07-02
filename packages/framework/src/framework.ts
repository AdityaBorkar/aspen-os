import { context } from "./lib/context";
import { closePool, getDrizzle } from "./lib/db";
import type { DatabaseConfig } from "./lib/types";
import {
  type AuthConfig,
  type AuthModule,
  createAuthModule,
} from "./modules/auth";
import * as authSchema from "./modules/auth/db-schema";
import { createORPCModule, type ORPCModule } from "./modules/orpc";
import { createPubSubModule, type PubSubModule } from "./modules/pubsub";

export interface FrameworkConfig {
  auth: AuthConfig;
  db: DatabaseConfig;
}

export class Framework {
  private config: FrameworkConfig;
  private authModule: AuthModule | null = null;
  private pubsubModule: PubSubModule | null = null;
  private orpcModule: ORPCModule | null = null;
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
    });

    this.orpcModule = createORPCModule();

    this.initialized = true;
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!this.initialized) throw new Error("Framework not initialized");
    const db = getDrizzle(this.config.db, authSchema);
    return context.run({ db, pubsub: this.pubsubModule! }, fn);
  }

  async destroy(): Promise<void> {
    if (this.authModule) await this.authModule.terminate();
    if (this.pubsubModule) await this.pubsubModule.destroy();
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

    // get rpc(): RpcModule {
    //   if (!this.pubsubModule) throw new Error("Framework not initialized");
    //   return this.pubsubModule;
    // }

    //   get sync(): SyncModule {
    //     if (!this.pubsubModule) throw new Error("Framework not initialized");
    //     return this.pubsubModule;
    //   }

  // get handlers() {
  //   return {
  //     auth: (): ((request: Request) => Promise<Response>) => {
  //       if (!this.authModule) throw new Error("Framework not initialized");
  //       return this.authModule.server.handler;
  //     },
  //     rpc: (): ((request: Request) => Promise<Response>) => {
  //       if (!this.orpcModule) throw new Error("Framework not initialized");
  //       const orpc = this.orpcModule;
  //       const db = getDrizzle(this.config.db, authSchema);
  //       const pubsub = this.pubsubModule!;
  //       return async (request: Request) => {
  //         const { matched, response } = await orpc.handle(request, {
  //           db,
  //           pubsub,
  //         });
  //         if (matched && response) return response;
  //         return new Response("Not Found", { status: 404 });
  //       };
  //     },
  //   };
  // }

  get client() {
    return {
      auth: this.authModule!.client,
    };
  }
}
