import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";

import { source } from "@/lib/source";

const server = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
});

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      // oxlint-disable-next-line eslint/new-cap
      GET: async ({ request }) => server.GET(request),
    },
  },
});
