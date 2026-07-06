import { RPCHandler } from "@orpc/server/fetch";

import type { AuthUnit } from "../auth";
import type { DatabaseUnit } from "../db";
import type { LoggingUnit } from "../logs";
import type { PubSubUnit } from "../pubsub";
import { type RpcRouter, router } from "./router";
import type { RpcConfig, RpcContext } from "./types";

export type { RpcConfig, RpcContext } from "./types";

export class RpcUnit {
  readonly name = "rpc";
  readonly router = router;

  private prefix: `/${string}`;
  private rpcHandler: InstanceType<typeof RPCHandler>;

  readonly server: {
    handle(
      request: Request,
      context: RpcContext,
    ): Promise<{ matched: boolean; response: Response | undefined }>;
    router: RpcRouter;
  };

  constructor(
    config: RpcConfig = {},
    _deps: {
      auth: AuthUnit;
      db: DatabaseUnit;
      logs: LoggingUnit;
      pubsub: PubSubUnit;
    },
  ) {
    this.prefix = (config.prefix ?? "/api/rpc") as `/${string}`;
    this.rpcHandler = new RPCHandler(router);

    this.server = {
      handle: this.handle.bind(this),
      router,
    };
  }

  async destroy(): Promise<void> {
    // Cleanup if needed
  }

  async healthCheck(): Promise<boolean> {
    return this.rpcHandler !== null;
  }

  async handle(
    request: Request,
    context: RpcContext,
  ): Promise<{ matched: boolean; response: Response | undefined }> {
    if (!this.rpcHandler) throw new Error("RPC unit not initialized");
    return this.rpcHandler.handle(request, {
      context,
      prefix: this.prefix,
    });
  }
}
