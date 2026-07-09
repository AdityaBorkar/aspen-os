import { createFileRoute } from "@tanstack/react-router";

import { auth, f } from "@/aspen/server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        return f.run(() => {
          return auth.server.handler(request);
        });
      },
    },
  },
});
