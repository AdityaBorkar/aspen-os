import type { AuthUnit } from "#/server/auth";
import type { DatabaseUnit } from "#/server/db";
import type { LogUnit } from "#/server/log";
import type { PubSubUnit } from "#/server/pubsub";
import { router } from "#/server/rpc/router";
import type { RpcRouter } from "#/server/rpc/router";
import type { RpcConfig, RpcContext } from "#/server/rpc/types";

import { RPCHandler } from "@orpc/server/fetch";

export type { RpcConfig, RpcContext } from "#/server/rpc/types";

export class RpcUnit {
  readonly $name = "rpc";
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
    _deps: {
      auth: AuthUnit;
      db: DatabaseUnit<any>;
      logs: LogUnit;
      pubsub: PubSubUnit;
    },
    config: RpcConfig = {},
  ) {
    this.prefix = (config.prefix ?? "/api/rpc") as `/${string}`;
    this.rpcHandler = new RPCHandler(router);

    this.server = {
      handle: this.handle.bind(this),
      router,
    };
  }

  async $prepareInfra(): Promise<void> {
    return;
  }

  async $cleanup(): Promise<void> {
    // Cleanup if needed
  }

  async handle(
    request: Request,
    context: RpcContext,
  ): Promise<{ matched: boolean; response: Response | undefined }> {
    if (!this.rpcHandler) {
      throw new Error("RPC unit not initialized");
    }
    return this.rpcHandler.handle(request, {
      context,
      prefix: this.prefix,
    });
  }
}
