import type { AuditUnit } from "#/server/audit";
import type { AuthUnit } from "#/server/auth";
import type { PubSubUnit } from "#/server/pubsub";
import type { SchemaMap } from "#/server/types";
import { AsyncLocalStorage } from "node:async_hooks";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type SchemaAgnosticDb = NodePgDatabase<SchemaMap>;

/**
 * The schema-agnostic db surface exposed through the execution context. The
 * relational `query` surface is intentionally not exposed; callers access
 * tables via `select().from(...)`.
 */
export interface ContextDb {
  delete: SchemaAgnosticDb["delete"];
  execute: SchemaAgnosticDb["execute"];
  insert: SchemaAgnosticDb["insert"];
  query: unknown;
  refreshMaterializedView: SchemaAgnosticDb["refreshMaterializedView"];
  select: SchemaAgnosticDb["select"];
  selectDistinct: SchemaAgnosticDb["selectDistinct"];
  transaction: SchemaAgnosticDb["transaction"];
  update: SchemaAgnosticDb["update"];
  with: SchemaAgnosticDb["with"];
}

export const context = new AsyncLocalStorage<{
  actorId?: string;
  audit?: AuditUnit;
  auth?: AuthUnit;
  db: ContextDb;
  pubsub: PubSubUnit;
  log?: null;
  rpc?: null;
  kvStore?: null;
  storage?: null;
  workflows?: null;
  tenantId?: string;
  requestId?: string;
  traceId?: string;
}>();

export function getContext() {
  const ctx = context.getStore();
  if (!ctx) {
    throw new Error("Context was not initialized");
  }
  return ctx;
}
