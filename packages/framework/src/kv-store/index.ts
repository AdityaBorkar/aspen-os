import { eq, like } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { DatabaseUnit } from "../db";
import * as db_schema from "./db-schema";
import type { KvStoreConfig } from "./types";

export type { KvStoreConfig } from "./types";

export class KvStoreUnit {
  readonly name = "kv-store" as const;
  readonly db_schema = db_schema;

  private db: NodePgDatabase;
  private defaultTtl: number;
  private prefix: string;

  constructor(config: KvStoreConfig, { db }: { db: DatabaseUnit }) {
    this.db = db.db;
    this.defaultTtl = config.defaultTtl ?? 3600;
    this.prefix = config.keyPrefix ?? "";
  }

  async destroy(): Promise<void> {
    // Cleanup if needed
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.execute("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const rows = await this.db
      .select({
        expiresAt: db_schema.kvStore.expiresAt,
        value: db_schema.kvStore.value,
      })
      .from(db_schema.kvStore)
      .where(eq(db_schema.kvStore.key, this.getKeyName(key)))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0];
    if (!row) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      await this.del(key);
      return null;
    }
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return row.value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    const effectiveTtl = ttl ?? this.defaultTtl;
    let expiresAt: Date | null = null;
    if (effectiveTtl > 0) {
      expiresAt = new Date(Date.now() + effectiveTtl * 1000);
    }

    await this.db
      .insert(db_schema.kvStore)
      .values({ expiresAt, key: this.getKeyName(key), value: serialized })
      .onConflictDoUpdate({
        set: { expiresAt, updatedAt: new Date(), value: serialized },
        target: db_schema.kvStore.key,
      });
  }

  async del(key: string): Promise<void> {
    await this.db
      .delete(db_schema.kvStore)
      .where(eq(db_schema.kvStore.key, this.getKeyName(key)));
  }

  async exists(key: string): Promise<boolean> {
    const rows = await this.db
      .select({ key: db_schema.kvStore.key })
      .from(db_schema.kvStore)
      .where(eq(db_schema.kvStore.key, this.getKeyName(key)))
      .limit(1);
    return rows.length > 0;
  }

  async increment(key: string, amount = 1): Promise<number> {
    const current = await this.get<string>(key);
    const val = current ? Number.parseInt(String(current), 10) : 0;
    const newVal = val + amount;
    await this.set(key, String(newVal));
    return newVal;
  }

  async decrement(key: string, amount = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async clear(pattern?: string): Promise<void> {
    const searchPattern = pattern
      ? this.getKeyName(pattern)
      : `${this.prefix}:*`;
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, found] = await this.scan(
        cursor,
        "MATCH",
        searchPattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== "0");

    for (const key of keys) {
      await this.db
        .delete(db_schema.kvStore)
        .where(eq(db_schema.kvStore.key, key));
    }
  }

  private getKeyName(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  private async scan(
    cursor: string,
    ...args: unknown[]
  ): Promise<[string, string[]]> {
    const pattern = args[1] as string | undefined;
    const count = (args[3] as number) || 100;
    const offset = Number.parseInt(cursor, 10) || 0;

    let query = this.db
      .select({ key: db_schema.kvStore.key })
      .from(db_schema.kvStore)
      .$dynamic();

    if (pattern) {
      const pgPattern = pattern.replace(/\*/g, "%").replace(/\?/g, "_");
      query = query.where(like(db_schema.kvStore.key, pgPattern));
    }

    const rows = await query.limit(count).offset(offset);
    const keys = rows.map((r: { key: string }) => r.key);
    const nextCursor = rows.length < count ? "0" : String(offset + rows.length);

    return [nextCursor, keys];
  }
}
