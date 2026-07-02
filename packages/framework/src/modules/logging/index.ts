import { getDrizzle, getPool } from "../../lib/db";
import { createEntryFactory, createLogBuffer } from "./buffer";
import * as schema from "./schema";
import { createLogQueryService } from "./service";
import type {
	ChildLogger,
	LEVEL_PRIORITY,
	LoggingConfig,
	LoggingModule,
	LogLevel,
} from "./types";
import { LEVEL_PRIORITY as levelPriority } from "./types";

export type {
	ChildLogger,
	LogEntry,
	LoggingConfig,
	LoggingModule,
	LogLevel,
	LogQuery,
	LogStats,
} from "./types";

export function createLoggingModule(config: LoggingConfig): LoggingModule {
	const pool = getPool(config.database);
	const db = getDrizzle(config.database, schema);
	const serviceName = config.serviceName ?? "app";
	const defaultLevel = config.defaultLevel ?? "info";

	const queryService = createLogQueryService(db);
	const createEntry = createEntryFactory(serviceName);

	const buffer = createLogBuffer(100, async (entries) => {
		await db.insert(schema.logs).values(
			entries.map((entry) => ({
				id: entry.id,
				level: entry.level,
				message: entry.message,
				service: entry.service,
				timestamp: entry.timestamp,
				metadata: entry.metadata ?? {},
				traceId: entry.traceId ?? null,
				spanId: entry.spanId ?? null,
				userId: entry.userId ?? null,
				requestId: entry.requestId ?? null,
				durationMs: entry.duration ?? null,
				errorName: entry.error?.name ?? null,
				errorMessage: entry.error?.message ?? null,
				errorStack: entry.error?.stack ?? null,
			})),
		);
	});

	let flushTimer: ReturnType<typeof setInterval> | null = null;

	function shouldLog(level: LogLevel): boolean {
		return levelPriority[level] >= levelPriority[defaultLevel];
	}

	function enqueue(
		level: LogLevel,
		message: string,
		metadata?: Record<string, unknown>,
		error?: Error,
	): void {
		if (!shouldLog(level)) return;
		buffer.push(createEntry(level, message, metadata, error));
	}

	async function initialize(): Promise<void> {
		await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        service TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        trace_id TEXT,
        span_id TEXT,
        user_id TEXT,
        request_id TEXT,
        duration_ms INTEGER,
        error_name TEXT,
        error_message TEXT,
        error_stack TEXT
      );

      SELECT create_hypertable('logs', 'timestamp', if_not_exists => TRUE);

      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
      CREATE INDEX IF NOT EXISTS idx_logs_trace_id ON logs(trace_id);
      CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
    `);

		flushTimer = setInterval(() => buffer.flush(), 5000);
	}

	async function destroy(): Promise<void> {
		if (flushTimer) {
			clearInterval(flushTimer);
			flushTimer = null;
		}
		await buffer.drain();
	}

	function child(context: Record<string, unknown>): ChildLogger {
		const mergeMeta = (meta?: Record<string, unknown>) => ({
			...context,
			...meta,
		});
		return {
			log: (level, message, metadata) =>
				enqueue(level, message, mergeMeta(metadata)),
			debug: (message, metadata) =>
				enqueue("debug", message, mergeMeta(metadata)),
			info: (message, metadata) =>
				enqueue("info", message, mergeMeta(metadata)),
			warn: (message, metadata) =>
				enqueue("warn", message, mergeMeta(metadata)),
			error: (message, err, metadata) => {
				if (shouldLog("error"))
					buffer.push(createEntry("error", message, mergeMeta(metadata), err));
			},
			fatal: (message, err, metadata) =>
				buffer.push(createEntry("fatal", message, mergeMeta(metadata), err)),
		};
	}

	return {
		initialize,
		destroy,
		log: (level, message, metadata) => enqueue(level, message, metadata),
		debug: (message, metadata) => enqueue("debug", message, metadata),
		info: (message, metadata) => enqueue("info", message, metadata),
		warn: (message, metadata) => enqueue("warn", message, metadata),
		error: (message, err, metadata) => {
			if (shouldLog("error"))
				buffer.push(createEntry("error", message, metadata, err));
		},
		fatal: (message, err, metadata) =>
			buffer.push(createEntry("fatal", message, metadata, err)),
		query: queryService.query,
		getStats: queryService.getStats,
		child,
	};
}
