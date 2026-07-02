import { eq, like } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { createDrizzle } from "../db";

export const kvStore = pgTable("kv_store", {
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  key: text("key").primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  value: text("value").notNull(),
});

export class PostgresKvStore {
  private pool;
  private db;
  private initialized = false;

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
    const row = rows[0]!;
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
