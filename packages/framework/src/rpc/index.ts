import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { z } from "zod";

import type { Unit, UnitDeps } from "../types";
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

export class RpcUnit implements Unit {
  readonly name = "rpc";
  readonly router = router;

  private prefix: `/${string}`;
  private rpcHandler: InstanceType<typeof RPCHandler> | null = null;
  private deps: UnitDeps | null = null;

  readonly server: {
    handle(
      request: Request,
      context: RpcContext,
    ): Promise<{ matched: boolean; response: Response | undefined }>;
    router: RpcRouter;
  };

  constructor(config: RpcConfig = {}) {
    this.prefix = (config.prefix ?? "/api/rpc") as `/${string}`;

    this.server = {
      handle: this.handle.bind(this),
      router,
    };
  }

  async initialize(incomingDeps: UnitDeps): Promise<void> {
    this.deps = incomingDeps;
    this.rpcHandler = new RPCHandler(router);
  }

  async destroy(): Promise<void> {
    this.rpcHandler = null;
    this.deps = null;
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

  async handler(request: Request): Promise<Response> {
    if (!this.rpcHandler || !this.deps)
      throw new Error("RPC unit not initialized");
    const { matched, response } = await this.handle(request, {
      db: this.deps.db,
      pubsub: this.deps.pubsub as unknown as import("../pubsub").PubSubUnit,
    });
    if (matched && response) return response;
    return new Response("Not Found", { status: 404 });
  }
}
