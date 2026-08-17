import type { AuditUnit } from "#/server/audit";
import type { AuthUnit } from "#/server/auth";
import type { PubSubUnit } from "#/server/pubsub";
import type { SchemaMap } from "#/server/types";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

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

export function isGlobalTenantId(tenantId: string | undefined) {
  return tenantId === "$global";
}

// SAFETY: node:crypto's scrypt is callback-based; promisify wraps it and the overloaded
// Signature must be narrowed to the (password, salt, keylen) arity used below.
const scryptAsync = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

async function hash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt:${salt.toString("base64")}:${key.toString("base64")}`;
}

async function verify(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltB64, keyB64] = storedHash.split(":");
  if (algorithm !== "scrypt" || !saltB64 || !keyB64) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64");
  const storedKey = Buffer.from(keyB64, "base64");
  const derivedKey = await scryptAsync(password, salt, storedKey.length);
  return timingSafeEqual(derivedKey, storedKey);
}

export const password = { hash, verify };
