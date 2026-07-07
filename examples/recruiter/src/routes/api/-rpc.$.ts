import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";

import { framework } from "@/aspen/server";
import { router } from "@/rpc/index";

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const Route = createFileRoute("/api/~rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        return framework.run(async () => {
          const { response } = await handler.handle(request, {
            context: {},
            prefix: "/api/rpc",
          });
          return response ?? new Response("Not Found", { status: 404 });
        });
      },
    },
  },
});
