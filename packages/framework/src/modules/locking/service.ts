import { and, eq, gt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as s from "./schema";
import type { Lock } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export function createLockService(
	db: DrizzleDB,
	pool: {
		query: (
			sql: string,
			params?: unknown[],
		) => Promise<{ rows: unknown[]; rowCount: number | null }>;
	},
	retryInterval: number,
) {
	async function acquire(
		key: string,
		timeout: number,
		ttl: number,
	): Promise<Lock | null> {
		const owner = crypto.randomUUID();
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			try {
				const result = await pool.query(
					`INSERT INTO distributed_locks (key, owner, expires_at)
           VALUES ($1, $2, NOW() + interval '${ttl} milliseconds')
           ON CONFLICT (key) DO UPDATE
           SET owner = EXCLUDED.owner, acquired_at = NOW(), expires_at = EXCLUDED.expires_at
           WHERE distributed_locks.expires_at < NOW()
           RETURNING key, acquired_at, expires_at`,
					[key, owner],
				);

				if ((result.rows as unknown[]).length > 0) {
					const row = result.rows[0] as Record<string, unknown>;
					return {
						key: row.key as string,
						acquiredAt: new Date(row.acquired_at as string),
						expiresAt: new Date(row.expires_at as string),
					};
				}
			} catch {
				// Lock contention, retry
			}

			await new Promise((resolve) => setTimeout(resolve, retryInterval));
		}

		return null;
	}

	async function release(key: string): Promise<boolean> {
		await db.delete(s.distributedLocks).where(eq(s.distributedLocks.key, key));
		return true;
	}

	async function extend(key: string, ttl: number): Promise<boolean> {
		const result = await pool.query(
			`UPDATE distributed_locks SET expires_at = NOW() + interval '${ttl} milliseconds'
       WHERE key = $1 AND expires_at > NOW()`,
			[key],
		);
		return (result.rowCount ?? 0) > 0;
	}

	async function isLocked(key: string): Promise<boolean> {
		const rows = await db
			.select({ key: s.distributedLocks.key })
			.from(s.distributedLocks)
			.where(
				and(
					eq(s.distributedLocks.key, key),
					gt(s.distributedLocks.expiresAt, new Date()),
				),
			)
			.limit(1);
		return rows.length > 0;
	}

	return { acquire, release, extend, isLocked };
}
