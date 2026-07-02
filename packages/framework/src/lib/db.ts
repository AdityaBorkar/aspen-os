import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { DatabaseConfig } from "./types";

let pool: pg.Pool | null = null;
let db: NodePgDatabase | null = null;

export function getPool(config: DatabaseConfig): pg.Pool {
	if (!pool) {
		pool = new pg.Pool({
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			ssl: config.ssl ? { rejectUnauthorized: false } : false,
			max: config.maxConnections ?? 20,
		});
	}
	return pool;
}

export function getDrizzle(
	config: DatabaseConfig,
	schema?: Record<string, unknown>,
): NodePgDatabase {
	if (!db) {
		const p = getPool(config);
		db = drizzle(p, { schema: schema as any });
	}
	return db;
}

export async function closePool(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
		db = null;
	}
}

export async function query<
	T extends pg.QueryResultRow = Record<string, unknown>,
>(
	config: DatabaseConfig,
	text: string,
	params?: unknown[],
): Promise<pg.QueryResult<T>> {
	const client = getPool(config);
	return client.query<T>(text, params);
}
