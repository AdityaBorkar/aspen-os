import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { z } from "zod";

import type { Module, ModuleDeps } from "../types";
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

export function createRpcModule(config: RpcConfig = {}): RpcModule & Module {
  const prefix = (config.prefix ?? "/api/rpc") as `/${string}`;
  let handler: InstanceType<typeof RPCHandler> | null = null;
  let deps: ModuleDeps | null = null;

  async function initialize(incomingDeps: ModuleDeps) {
    deps = incomingDeps;
    handler = new RPCHandler(router);
  }

  async function destroy() {
    handler = null;
    deps = null;
  }

  async function healthCheckResult(): Promise<boolean> {
    return handler !== null;
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
    if (!handler || !deps) throw new Error("RPC module not initialized");
    const { matched, response } = await handle(request, {
      db: deps.db,
      pubsub: deps.pubsub as unknown as import("../pubsub").PubSubModule,
    });
    if (matched && response) return response;
    return new Response("Not Found", { status: 404 });
  }

  return {
    destroy,
    handler: requestHandler,
    healthCheck: healthCheckResult,
    initialize,
    name: "rpc",
    router,
    server: {
      handle,
      router,
    },
  };
}
