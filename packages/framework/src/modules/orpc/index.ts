import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";

import type { PubSubModule } from "../pubsub";

export interface ORPCContext {
  db: NodePgDatabase<Record<string, never>>;
  pubsub: PubSubModule;
}

const base = os.$context<ORPCContext>();

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

export type ORPCRouter = typeof router;

export interface ORPCModule {
  handle(
    request: Request,
    context: ORPCContext,
  ): Promise<{ matched: boolean; response: Response | undefined }>;
  router: ORPCRouter;
}

export function createORPCModule(): ORPCModule {
  const handler = new RPCHandler(router);

  return {
    async handle(request, context) {
      return handler.handle(request, {
        context,
        prefix: "/api/rpc",
      });
    },
    router,
  };
}
