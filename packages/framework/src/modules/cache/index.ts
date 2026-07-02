import { closeRedis, getRedis } from "../../lib/redis";
import type { DatabaseConfig } from "../../lib/types";

export interface CacheConfig {
  database: DatabaseConfig;
  defaultTtl?: number;
  keyPrefix?: string;
}

export interface CacheModule {
  clear(pattern?: string): Promise<void>;
  decrement(key: string, amount?: number): Promise<number>;
  del(key: string): Promise<void>;
  delMany(keys: string[]): Promise<void>;
  destroy(): Promise<void>;
  exists(key: string): Promise<boolean>;

  get<T = unknown>(key: string): Promise<T | null>;

  getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T>;
  increment(key: string, amount?: number): Promise<number>;
  initialize(): Promise<void>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
}

export function createCacheModule(config: CacheConfig): CacheModule {
  const kv = getRedis(config.database);
  const defaultTtl = config.defaultTtl ?? 3600;
  const prefix = config.keyPrefix ?? "";

  function k(key: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  async function initialize(): Promise<void> {
    await kv.initialize();
    await kv.ping();
  }

  async function destroy(): Promise<void> {
    await closeRedis();
  }

  async function get<T = unknown>(key: string): Promise<T | null> {
    const value = await kv.get(k(key));
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async function set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    const effectiveTtl = ttl ?? defaultTtl;
    if (effectiveTtl > 0) {
      await kv.set(k(key), serialized, "EX", effectiveTtl);
    } else {
      await kv.set(k(key), serialized);
    }
  }

  async function del(key: string): Promise<void> {
    await kv.del(k(key));
  }

  async function delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await kv.del(...keys.map(k));
  }

  async function exists(key: string): Promise<boolean> {
    const result = await kv.exists(k(key));
    return result === 1;
  }

  async function increment(key: string, amount = 1): Promise<number> {
    return kv.incrby(k(key), amount);
  }

  async function decrement(key: string, amount = 1): Promise<number> {
    return kv.decrby(k(key), amount);
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
    const searchPattern = pattern ? k(pattern) : `${prefix}:*`;
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, found] = await kv.scan(
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
      await kv.del(...keys);
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
    increment,
    initialize,
    set,
  };
}
