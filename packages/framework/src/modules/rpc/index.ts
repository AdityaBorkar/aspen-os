import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { z } from "zod";

import { getContext } from "@/lib";
import type { RpcConfig, RpcContext, RpcModule } from "./types";

export type { RpcConfig, RpcContext, RpcModule } from "./types";

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

export function createRpcModule(config: RpcConfig = {}): RpcModule {
  const prefix = (config.prefix ?? "/api/rpc") as `/${string}`;
  let handler: InstanceType<typeof RPCHandler> | null = null;

  async function register() {
    handler = new RPCHandler(router);
  }

  async function terminate() {
    handler = null;
  }

  async function handle(
    request: Request,
    context: RpcContext,
  ): Promise<{ matched: boolean; response: Response | undefined }> {
    if (!handler) throw new Error("RPC module not initialized");
    return handler.handle(request, {
      context,
      prefix,
    });
  }

  async function requestHandler(request: Request): Promise<Response> {
    if (!handler) throw new Error("RPC module not initialized");
    const { db, pubsub } = getContext();
    const { matched, response } = await handle(request, { db, pubsub });
    if (matched && response) return response;
    return new Response("Not Found", { status: 404 });
  }

  return {
    register,
    terminate,
    handler: requestHandler,
    router,
    server: {
      handle,
      router,
    },
  };
}
