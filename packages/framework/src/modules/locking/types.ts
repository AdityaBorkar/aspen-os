import type { DatabaseConfig } from "../../lib/types";

export interface LockingConfig {
  database: DatabaseConfig;
  defaultTimeout?: number;
  maxRetries?: number;
  retryInterval?: number;
}

export interface Lock {
  acquiredAt: Date;
  expiresAt: Date;
  key: string;
}

export interface LockingModule {
  acquire(
    key: string,
    options?: { timeout?: number; ttl?: number },
  ): Promise<Lock | null>;
  destroy(): Promise<void>;
  extend(key: string, ttl: number): Promise<boolean>;
  initialize(): Promise<void>;
  isLocked(key: string): Promise<boolean>;
  release(key: string): Promise<boolean>;
  withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options?: { timeout?: number; ttl?: number },
  ): Promise<T>;
}
