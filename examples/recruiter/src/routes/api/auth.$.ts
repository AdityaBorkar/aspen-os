import { createFileRoute } from "@tanstack/react-router";

import { auth, framework } from "@/aspen/server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        return framework.run(() => {
          return auth.server.handler(request);
        });
      },
    },
  },
});
