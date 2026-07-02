import { AsyncLocalStorage } from "node:async_hooks";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export const context = new AsyncLocalStorage<{
  db: NodePgDatabase<Record<string, never>>;
  pubsub: { publish<T = unknown>(topic: string, data: T): Promise<string> };
}>();

export function getContext() {
  const ctx = context.getStore();
  if (!ctx) throw new Error("Context was not initialized");
  return ctx;
}
