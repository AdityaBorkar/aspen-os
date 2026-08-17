import type { DatabaseUnit } from "#/server/db";
import * as db_schema from "#/server/db/schema";
import type { JsonValue } from "#/server/types";
import { context } from "#/server/utils";

import { eq, like, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { KvStoreConfig } from "./types";

type DrizzleDB = NodePgDatabase;

export class KvStoreUnit {
  readonly $name = "kvStore" as const;
  readonly db_schema = db_schema;

  private readonly db: DrizzleDB;
  private readonly defaultTtl: number;
  private readonly prefix: string;

  constructor(config: KvStoreConfig, { db }: { db: DatabaseUnit<any> }) {
    // SAFETY: the DatabaseUnit db is a valid node-postgres drizzle instance.
    this.db = db.db as DrizzleDB;
    this.defaultTtl = config.defaultTtl ?? 3600;
    this.prefix = config.keyPrefix ?? "";
  }

  async $prepareInfra(): Promise<void> {}

  async $cleanup(): Promise<void> {
    // Cleanup if needed
  }

  async get(key: string): Promise<JsonValue | null> {
    const rows = await this.db
      .select({
        expiresAt: db_schema.kvStore.expiresAt,
        value: db_schema.kvStore.value,
      })
      .from(db_schema.kvStore)
      .where(eq(db_schema.kvStore.key, this.getKeyName(key)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }
    const [row] = rows;
    if (!row) {
      return null;
    }
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      await this.del(key);
      return null;
    }
    return this.parseStoredValue(row.value);
  }

  async set(key: string, value: JsonValue, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
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
    await this.db.delete(db_schema.kvStore).where(eq(db_schema.kvStore.key, this.getKeyName(key)));
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

    const [row] = result;
    if (!row) {
      throw new Error("Failed to increment key");
    }
    return Number.parseInt(row.value, 10);
  }

  async decrement(key: string, amount = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  async getOrSet(key: string, factory: () => Promise<JsonValue>, ttl?: number): Promise<JsonValue> {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async clear(pattern?: string): Promise<void> {
    const tenantId = context.getStore()?.tenantId ?? "default";
    const tenantPrefix = this.getTenantPrefix(tenantId);
    const searchPattern = pattern ? this.getKeyName(pattern) : `${tenantPrefix}*`;
    const keys: string[] = [];
    let cursor = "0";
    // oxlint-disable eslint/no-await-in-loop
    do {
      const [nextCursor, found] = await this.scan(cursor, searchPattern, 100);
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== "0");
    // oxlint-enable eslint/no-await-in-loop

    await Promise.all(
      keys.map(async (key) => {
        await this.db.delete(db_schema.kvStore).where(eq(db_schema.kvStore.key, key));
      }),
    );
  }

  private getTenantPrefix(tenantId: string): string {
    return this.prefix ? `${this.prefix}:${tenantId}:` : `${tenantId}:`;
  }

  private getKeyName(key: string): string {
    const tenantId = context.getStore()?.tenantId ?? "default";
    return `${this.getTenantPrefix(tenantId)}${key}`;
  }

  private async scan(cursor: string, pattern: string, count: number): Promise<[string, string[]]> {
    const offset = Number.parseInt(cursor, 10) || 0;

    let query = this.db.select({ key: db_schema.kvStore.key }).from(db_schema.kvStore).$dynamic();

    if (pattern) {
      const pgPattern = pattern.replaceAll("*", "%").replaceAll("?", "_");
      query = query.where(like(db_schema.kvStore.key, pgPattern));
    }

    const rows = await query.limit(count).offset(offset);
    const keys = rows.map((row: { key: string }) => row.key);
    const nextCursor = rows.length < count ? "0" : String(offset + rows.length);

    return [nextCursor, keys];
  }

  private parseStoredValue(raw: string): JsonValue {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
