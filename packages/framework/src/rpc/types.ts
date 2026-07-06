import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { PubSubUnit } from "../pubsub";

export interface RpcContext {
  db: NodePgDatabase<Record<string, never>>;
  pubsub: PubSubUnit;
}

export interface RpcConfig {
  prefix?: string;
}

export interface RpcUnit {
  readonly name: string;
  readonly router: import("./index").RpcRouter;

  server: {
    handle(
      request: Request,
      context: RpcContext,
    ): Promise<{ matched: boolean; response: Response | undefined }>;
    router: import("./index").RpcRouter;
  };
}
