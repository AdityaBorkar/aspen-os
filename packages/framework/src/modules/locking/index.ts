import { getDrizzle, getPool } from "../../lib/db";
import * as schema from "./schema";
import { createLockService } from "./service";
import type { LockingConfig, LockingModule } from "./types";

export type { Lock, LockingConfig, LockingModule } from "./types";

const DEFAULTS = {
	timeout: 30000,
	ttl: 30000,
	retryInterval: 100,
} as const;

export function createLockingModule(config: LockingConfig): LockingModule {
	const pool = getPool(config.database);
	const db = getDrizzle(config.database, schema);
	const lockService = createLockService(
		db,
		pool,
		config.retryInterval ?? DEFAULTS.retryInterval,
	);

	async function initialize(): Promise<void> {
		await pool.query(`
      CREATE TABLE IF NOT EXISTS distributed_locks (
        key TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);
	}

	async function destroy(): Promise<void> {}

	async function acquire(
		key: string,
		options?: { timeout?: number; ttl?: number },
	): Promise<import("./types").Lock | null> {
		return lockService.acquire(
			key,
			options?.timeout ?? DEFAULTS.timeout,
			options?.ttl ?? DEFAULTS.ttl,
		);
	}

	async function withLock<T>(
		key: string,
		fn: () => Promise<T>,
		options?: { timeout?: number; ttl?: number },
	): Promise<T> {
		const lock = await acquire(key, options);
		if (!lock)
			throw new Error(`Failed to acquire lock "${key}" within timeout`);
		try {
			return await fn();
		} finally {
			await lockService.release(key);
		}
	}

	return {
		initialize,
		destroy,
		acquire,
		release: lockService.release,
		extend: lockService.extend,
		isLocked: lockService.isLocked,
		withLock,
	};
}
