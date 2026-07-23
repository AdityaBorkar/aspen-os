import { createFileRoute } from "@tanstack/react-router";

import { p } from "@/aspen/server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        return p.run(() => {
          return p.auth.auth.handler(request);
        });
      },
    },
  },
});
