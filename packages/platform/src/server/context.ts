import { AsyncLocalStorage } from "node:async_hooks";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { AuthUnit } from "./auth";
import type { PubSubUnit } from "./pubsub";

export const context = new AsyncLocalStorage<{
  actorId?: string;
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
  console.log("Getting context...");
  const ctx = context.getStore();
  console.log({ ctx });
  if (!ctx) throw new Error("Context was not initialized");
  return ctx;
}
