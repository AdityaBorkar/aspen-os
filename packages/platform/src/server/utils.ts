import type { AuditUnit } from "#/server/audit";
import type { AuthUnit } from "#/server/auth";
import type { LogUnit } from "#/server/log";
import type { PubSubUnit } from "#/server/pubsub";
import type { SchemaMap } from "#/server/types";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import type { DrizzleDB } from "./db";

/**
 * The execution surface exposed to `getContext()` callers. The core units
 * (`db`, `audit`, `auth`, `pubsub`, `log`) are strictly defined — they are always
 * populated by the platform when a context scope is entered. Only the
 * request-scoped metadata identifiers are optional, because they genuinely may
 * be absent (background jobs, system-initiated work, etc.).
 */
export interface Context {
  db: DrizzleDB;
  audit: AuditUnit;
  auth: AuthUnit;
  pubsub: PubSubUnit;
  log: LogUnit;
  actorId?: string;
  tenantId?: string;
  requestId?: string;
  traceId?: string;
}

export const context = new AsyncLocalStorage<Context>();

/**
 * Unit overrides merged over the ambient store by `getContext()`. Each
 * provided field wins over the ambient `context.getStore()` value; omitted
 * fields fall back to it. Supplying a complete set removes the need for an
 * ambient scope (e.g. calling a workflow outside `Platform.run()`).
 */
export interface ContextOverrides {
  actorId?: string;
  audit?: AuditUnit;
  auth?: AuthUnit;
  db?: DrizzleDB<SchemaMap>;
  log?: LogUnit;
  pubsub?: PubSubUnit;
  requestId?: string;
  tenantId?: string;
  traceId?: string;
}

/**
 * Returns the active execution context, optionally merged over `overrides`.
 *
 * Without overrides it returns the ambient store, throwing a self-describing
 * error when none is established. Code must run within a `context.run(...)`
 * scope created by `Platform.run()`, a pg-boss `wrapHandler`, or explicit
 * overrides.
 */
export function getContext(overrides?: ContextOverrides): Context {
  const ctx = context.getStore();
  if (!overrides) {
    if (!ctx) {
      const caller =
        new Error("capture context caller").stack?.split("\n")[1]?.trim() ?? "unknown caller";
      throw new Error(
        `Context was not initialized; ${caller} ran outside an execution scope. ` +
          `Ensure the call happens inside Platform.run().`,
      );
    }
    return ctx;
  }
  const audit = overrides.audit ?? ctx?.audit;
  const auth = overrides.auth ?? ctx?.auth;
  // SAFETY: overrides.db uses the broad SchemaMap generic while Context.db uses the default schema; both are postgres-js drizzle instances sharing the same runtime surface.
  const db = (overrides.db ?? ctx?.db) as Context["db"] | undefined;
  const log = overrides.log ?? ctx?.log;
  const pubsub = overrides.pubsub ?? ctx?.pubsub;
  if (!audit || !auth || !db || !log || !pubsub) {
    throw new Error(
      "Incomplete execution context; provide audit, auth, db, log, and pubsub in overrides or call inside Platform.run().",
    );
  }
  return {
    actorId: overrides.actorId ?? ctx?.actorId,
    audit,
    auth,
    db,
    log,
    pubsub,
    requestId: overrides.requestId ?? ctx?.requestId,
    tenantId: overrides.tenantId ?? ctx?.tenantId,
    traceId: overrides.traceId ?? ctx?.traceId,
  };
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
