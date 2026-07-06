import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { z } from "zod";

import type { RpcConfig, RpcContext } from "./types";

export type { RpcConfig, RpcContext } from "./types";

const base = os.$context<RpcContext>();

export const healthCheck = base.handler(async () => {
  return { status: "ok" as const };
});

export const echo = base
  .input(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    return { echo: input.message };
  });

export const router = {
  echo,
  health: {
    check: healthCheck,
  },
};

export type RpcRouter = typeof router;

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

  constructor(config: RpcConfig = {}) {
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
