import { createKvStore, type PostgresKvStore } from "../kv-store";
import type { Module, ModuleDeps } from "../types";

export interface CacheConfig {
  defaultTtl?: number;
  keyPrefix?: string;
}

export interface CacheModule extends Module {
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

export function createCacheModule(config: CacheConfig): CacheModule {
  const defaultTtl = config.defaultTtl ?? 3600;
  const prefix = config.keyPrefix ?? "";
  let kv: PostgresKvStore | null = null;

  function k(key: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  async function initialize(deps: ModuleDeps): Promise<void> {
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
    if (!kv) throw new Error("Cache module not initialized");
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
    name: "cache",
    set,
  };
}
