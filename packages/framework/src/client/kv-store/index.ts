import type { KvStoreConfig } from "./types";

export type { KvStoreConfig } from "./types";

export class KvStoreUnit {
  readonly name = "kv-store" as const;

  constructor(_config: KvStoreConfig, _deps?: { db?: unknown }) {
    throw new Error(
      "KvStoreUnit is not supported on the client side. Use server-side framework instead.",
    );
  }

  async prepare(): Promise<void> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }

  async destroy(): Promise<void> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }

  async get<T = unknown>(_key: string): Promise<T | null> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }

  async set(_key: string, _value: unknown, _ttl?: number): Promise<void> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }

  async del(_key: string): Promise<void> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }

  async increment(_key: string, _amount?: number): Promise<number> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }

  async decrement(_key: string, _amount?: number): Promise<number> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }

  async getOrSet<T = unknown>(
    _key: string,
    _factory: () => Promise<T>,
    _ttl?: number,
  ): Promise<T> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }

  async clear(_pattern?: string): Promise<void> {
    throw new Error("KvStoreUnit is not supported on the client side.");
  }
}
