import { AsyncLocalStorage } from "node:async_hooks";

import type { Auth } from "better-auth";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { PubSubUnit } from "./pubsub";

export const context = new AsyncLocalStorage<{
  auth?: Auth;
  db: NodePgDatabase<Record<string, never>>;
  pubsub: PubSubUnit;
  tenantId?: string;
}>();

export function getContext() {
  const ctx = context.getStore();
  if (!ctx) throw new Error("Context was not initialized");
  return ctx;
}
