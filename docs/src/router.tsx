import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
import { NotFound } from "@/components/not-found";

export function getRouter() {
  return createTanStackRouter({
    defaultNotFoundComponent: NotFound,
    defaultPreload: "intent",
    routeTree,
    scrollRestoration: true,
  });
}
