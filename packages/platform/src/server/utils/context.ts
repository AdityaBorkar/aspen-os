import type { AuditUnit } from "#/server/audit";
import type { AuthUnit } from "#/server/auth";
import type { PubSubUnit } from "#/server/pubsub";
import { AsyncLocalStorage } from "node:async_hooks";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export const context = new AsyncLocalStorage<{
  actorId?: string;
  audit?: AuditUnit;
  auth?: AuthUnit;
  db: NodePgDatabase<Record<string, unknown>>;
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
  if (!ctx) {
    throw new Error("Context was not initialized");
  }
  return ctx;
}
