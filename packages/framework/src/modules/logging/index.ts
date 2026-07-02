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
        durationMs: entry.duration ?? null,
        errorMessage: entry.error?.message ?? null,
        errorName: entry.error?.name ?? null,
        errorStack: entry.error?.stack ?? null,
        id: entry.id,
        level: entry.level,
        message: entry.message,
        metadata: entry.metadata ?? {},
        requestId: entry.requestId ?? null,
        service: entry.service,
        spanId: entry.spanId ?? null,
        timestamp: entry.timestamp,
        traceId: entry.traceId ?? null,
        userId: entry.userId ?? null,
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
      debug: (message, metadata) =>
        enqueue("debug", message, mergeMeta(metadata)),
      error: (message, err, metadata) => {
        if (shouldLog("error"))
          buffer.push(createEntry("error", message, mergeMeta(metadata), err));
      },
      fatal: (message, err, metadata) =>
        buffer.push(createEntry("fatal", message, mergeMeta(metadata), err)),
      info: (message, metadata) =>
        enqueue("info", message, mergeMeta(metadata)),
      log: (level, message, metadata) =>
        enqueue(level, message, mergeMeta(metadata)),
      warn: (message, metadata) =>
        enqueue("warn", message, mergeMeta(metadata)),
    };
  }

  return {
    child,
    debug: (message, metadata) => enqueue("debug", message, metadata),
    destroy,
    error: (message, err, metadata) => {
      if (shouldLog("error"))
        buffer.push(createEntry("error", message, metadata, err));
    },
    fatal: (message, err, metadata) =>
      buffer.push(createEntry("fatal", message, metadata, err)),
    getStats: queryService.getStats,
    info: (message, metadata) => enqueue("info", message, metadata),
    initialize,
    log: (level, message, metadata) => enqueue(level, message, metadata),
    query: queryService.query,
    warn: (message, metadata) => enqueue("warn", message, metadata),
  };
}
