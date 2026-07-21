import { eq, like, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { context } from "../context";
import type { DatabaseUnit } from "../db";
import * as db_schema from "./db-schema";
import type { KvStoreConfig } from "./types";

export type { KvStoreConfig } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export class KvStoreUnit {
  readonly $name = "kvStore" as const;
  readonly db_schema = db_schema;

  private db: DrizzleDB;
  private defaultTtl: number;
  private prefix: string;

  constructor(config: KvStoreConfig, { db }: { db: DatabaseUnit }) {
    this.db = db.db;
    this.defaultTtl = config.defaultTtl ?? 3600;
    this.prefix = config.keyPrefix ?? "";
  }

  async $prepare(): Promise<void> {
    return;
  }

  async $destroy(): Promise<void> {
    // Cleanup if needed
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
    const fullKey = this.getKeyName(key);
    const effectiveTtl = this.defaultTtl;
    let expiresAt: Date | null = null;
    if (effectiveTtl > 0) {
      expiresAt = new Date(Date.now() + effectiveTtl * 1000);
    }

    const result = await this.db
      .insert(db_schema.kvStore)
      .values({
        expiresAt,
        key: fullKey,
        value: String(amount),
      })
      .onConflictDoUpdate({
        set: {
          expiresAt,
          updatedAt: new Date(),
          value: sql`CASE
            WHEN ${db_schema.kvStore.expiresAt} IS NULL OR ${db_schema.kvStore.expiresAt} > NOW()
            THEN (CAST(${db_schema.kvStore.value} AS INTEGER) + ${amount})::text
            ELSE ${String(amount)}
          END`,
        },
        target: db_schema.kvStore.key,
      })
      .returning({ value: db_schema.kvStore.value });

    const row = result[0];
    if (!row) throw new Error("Failed to increment key");
    return Number.parseInt(row.value, 10);
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
    const tenantId = context.getStore()?.tenantId ?? "default";
    const tenantPrefix = this.getTenantPrefix(tenantId);
    const searchPattern = pattern
      ? this.getKeyName(pattern)
      : `${tenantPrefix}*`;
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

  private getTenantPrefix(tenantId: string): string {
    return this.prefix ? `${this.prefix}:${tenantId}:` : `${tenantId}:`;
  }

  private getKeyName(key: string): string {
    const tenantId = context.getStore()?.tenantId ?? "default";
    return `${this.getTenantPrefix(tenantId)}${key}`;
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
