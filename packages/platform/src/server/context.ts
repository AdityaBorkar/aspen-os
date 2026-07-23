import { AsyncLocalStorage } from "node:async_hooks";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { AuthUnit } from "./auth";
import type { PubSubUnit } from "./pubsub";

export const context = new AsyncLocalStorage<{
  auth?: AuthUnit;
  db: NodePgDatabase<Record<string, never>>;
  pubsub: PubSubUnit;
  log?: null;
  rpc?: null;
  kvStore?: null;
  storage?: null;
  workflows?: null;
  tenantId?: string;
}>();

export function getContext() {
  const ctx = context.getStore();
  if (!ctx) throw new Error("Context was not initialized");
  return ctx;
}
