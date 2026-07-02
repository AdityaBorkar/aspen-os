import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PubSubModule } from "../pubsub";

export interface RpcContext {
  db: NodePgDatabase<Record<string, never>>;
  pubsub: PubSubModule;
}

export interface RpcConfig {
  prefix?: string;
}

export interface RpcModule {
  register(): Promise<void>;
  terminate(): Promise<void>;

  handler(request: Request): Promise<Response>;
  router: import("./index").RpcRouter;

  server: {
    handle(
      request: Request,
      context: RpcContext,
    ): Promise<{ matched: boolean; response: Response | undefined }>;
    router: import("./index").RpcRouter;
  };
}
