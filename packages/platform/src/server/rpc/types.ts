import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { PubSubUnit } from "../pubsub";
import type { RpcRouter } from "./router";

export interface RpcContext {
  db: NodePgDatabase<Record<string, never>>;
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
    handle(
      request: Request,
      context: RpcContext,
    ): Promise<{ matched: boolean; response: Response | undefined }>;
    router: RpcRouter;
  };
}
