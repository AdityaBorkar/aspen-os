import { eq, like } from "drizzle-orm";

import { createDrizzle } from "../db";
import type { Unit, UnitDeps } from "../types";
import { kvStore } from "./db-schema";

export interface KvStoreConfig {
  defaultTtl?: number;
  keyPrefix?: string;
}

export interface KvStoreUnit extends Unit {
  clear(pattern?: string): Promise<void>;
  decrement(key: string, amount?: number): Promise<number>;
  del(key: string): Promise<void>;
  delMany(keys: string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  get<T = unknown>(key: string): Promise<T | null>;
  getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T>;
  increment(key: string, amount?: number): Promise<number>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
}

export class PostgresKvStore {
  private pool;
  private db;
  private initialized: boolean = false;

  constructor(pool: import("pg").Pool) {
    this.pool = pool;
    this.db = createDrizzle(pool, { kvStore });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.pool.query(`
      CREATE UNLOGGED TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_kv_store_expires_at
        ON kv_store (expires_at) WHERE expires_at IS NOT NULL;
    `);
    this.initialized = true;
  }

  async ping(): Promise<string> {
    await this.pool.query("SELECT 1");
    return "PONG";
  }

  async get(key: string): Promise<string | null> {
    const rows = await this.db
      .select({ expiresAt: kvStore.expiresAt, value: kvStore.value })
      .from(kvStore)
      .where(eq(kvStore.key, key))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0];
    if (!row) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      await this.del(key);
      return null;
    }
    return row.value;
  }

  async set(
    key: string,
    value: string,
    options?: { ttlSeconds?: number },
  ): Promise<void> {
    let expiresAt: Date | null = null;
    if (options?.ttlSeconds) {
      expiresAt = new Date(Date.now() + options.ttlSeconds * 1000);
    }

    await this.db
      .insert(kvStore)
      .values({ expiresAt, key, value })
      .onConflictDoUpdate({
        set: { expiresAt, updatedAt: new Date(), value },
        target: kvStore.key,
      });
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      const result = await this.db.delete(kvStore).where(eq(kvStore.key, key));
      count += result.rowCount ?? 0;
    }
    return count;
  }

  async exists(key: string): Promise<number> {
    const rows = await this.db
      .select({ key: kvStore.key })
      .from(kvStore)
      .where(eq(kvStore.key, key))
      .limit(1);
    return rows.length > 0 ? 1 : 0;
  }

  async incrby(key: string, amount: number): Promise<number> {
    const current = await this.get(key);
    const val = current ? Number.parseInt(current, 10) : 0;
    const newVal = val + amount;
    await this.set(key, String(newVal));
    return newVal;
  }

  async decrby(key: string, amount: number): Promise<number> {
    return this.incrby(key, -amount);
  }

  async scan(cursor: string, ...args: unknown[]): Promise<[string, string[]]> {
    const pattern = args[1] as string | undefined;
    const count = (args[3] as number) || 100;
    const offset = Number.parseInt(cursor, 10) || 0;

    let query = this.db.select({ key: kvStore.key }).from(kvStore).$dynamic();

    if (pattern) {
      const pgPattern = pattern.replace(/\*/g, "%").replace(/\?/g, "_");
      query = query.where(like(kvStore.key, pgPattern));
    }

    const rows = await query.limit(count).offset(offset);
    const keys = rows.map((r) => r.key);
    const nextCursor = rows.length < count ? "0" : String(offset + rows.length);

    return [nextCursor, keys];
  }

  async close(): Promise<void> {
    // Pool is shared, don't close it here
  }
}

export function createKvStore(pool: import("pg").Pool): PostgresKvStore {
  return new PostgresKvStore(pool);
}

export function createKvStoreUnit(config: KvStoreConfig = {}): KvStoreUnit {
  const defaultTtl = config.defaultTtl ?? 3600;
  const prefix = config.keyPrefix ?? "";
  let kv: PostgresKvStore | null = null;

  function k(key: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  async function initialize(deps: UnitDeps): Promise<void> {
    kv = createKvStore(deps.pool);
    await kv.initialize();
    await kv.ping();
  }

  async function destroy(): Promise<void> {
    kv = null;
  }

  async function healthCheck(): Promise<boolean> {
    if (!kv) return false;
    try {
      await kv.ping();
      return true;
    } catch {
      return false;
    }
  }

  function requireKv(): PostgresKvStore {
    if (!kv) throw new Error("KvStore unit not initialized");
    return kv;
  }

  async function get<T = unknown>(key: string): Promise<T | null> {
    const value = await requireKv().get(k(key));
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async function set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    const effectiveTtl = ttl ?? defaultTtl;
    if (effectiveTtl > 0) {
      await requireKv().set(k(key), serialized, { ttlSeconds: effectiveTtl });
    } else {
      await requireKv().set(k(key), serialized);
    }
  }

  async function del(key: string): Promise<void> {
    await requireKv().del(k(key));
  }

  async function delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await requireKv().del(...keys.map(k));
  }

  async function exists(key: string): Promise<boolean> {
    const result = await requireKv().exists(k(key));
    return result === 1;
  }

  async function increment(key: string, amount = 1): Promise<number> {
    return requireKv().incrby(k(key), amount);
  }

  async function decrement(key: string, amount = 1): Promise<number> {
    return requireKv().decrby(k(key), amount);
  }

  async function getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await set(key, value, ttl);
    return value;
  }

  async function clear(pattern?: string): Promise<void> {
    const store = requireKv();
    const searchPattern = pattern ? k(pattern) : `${prefix}:*`;
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, found] = await store.scan(
        cursor,
        "MATCH",
        searchPattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== "0");

    if (keys.length > 0) {
      await store.del(...keys);
    }
  }

  return {
    clear,
    decrement,
    del,
    delMany,
    destroy,
    exists,
    get,
    getOrSet,
    healthCheck,
    increment,
    initialize,
    name: "kv-store",
    set,
  };
}

export const createCacheUnit = createKvStoreUnit;
export type CacheUnit = KvStoreUnit;
export type CacheConfig = KvStoreConfig;
