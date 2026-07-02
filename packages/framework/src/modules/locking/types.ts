import type { DatabaseConfig } from "../../lib/types";

export interface LockingConfig {
	database: DatabaseConfig;
	defaultTimeout?: number;
	retryInterval?: number;
	maxRetries?: number;
}

export interface Lock {
	key: string;
	acquiredAt: Date;
	expiresAt: Date;
}

export interface LockingModule {
	initialize(): Promise<void>;
	destroy(): Promise<void>;

	acquire(
		key: string,
		options?: { timeout?: number; ttl?: number },
	): Promise<Lock | null>;
	release(key: string): Promise<boolean>;
	extend(key: string, ttl: number): Promise<boolean>;
	isLocked(key: string): Promise<boolean>;
	withLock<T>(
		key: string,
		fn: () => Promise<T>,
		options?: { timeout?: number; ttl?: number },
	): Promise<T>;
}
