import type { PubSubUnit } from "#/server/pubsub";
import type { RpcRouter } from "#/server/rpc/router";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface RpcContext {
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
  tenantId?: string;
}

export interface RpcConfig {
  prefix?: string;
}

export interface RpcUnit {
  readonly name: string;
  readonly router: RpcRouter;

  server: {
    handle: (
      request: Request,
      context: RpcContext,
    ) => Promise<{ matched: boolean; response: Response | undefined }>;
    router: RpcRouter;
  };
}
