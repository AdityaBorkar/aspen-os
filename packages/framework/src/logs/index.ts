import { createDrizzle } from "../db";
import type { Unit, UnitDeps } from "../types";
import { createEntryFactory, createLogBuffer } from "./buffer";
import * as schema from "./schema";
import { LogQueryService } from "./service";
import type { ChildLogger, LoggingConfig, LogLevel } from "./types";
import { LEVEL_PRIORITY as levelPriority } from "./types";

export { LogQueryService } from "./service";
export type {
  ChildLogger,
  LogEntry,
  LoggingConfig,
  LogLevel,
  LogQuery,
  LogStats,
} from "./types";

export class LoggingUnit implements Unit {
  readonly name = "logs";

  private serviceName: string;
  private defaultLevel: LogLevel;
  private pool: import("pg").Pool | null = null;
  private db: ReturnType<typeof createDrizzle> | null = null;
  private queryService: LogQueryService | null = null;
  private buffer: ReturnType<typeof createLogBuffer> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private createEntry: (
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
  ) => import("./types").LogEntry;

  constructor(config: LoggingConfig) {
    this.serviceName = config.serviceName ?? "app";
    this.defaultLevel = config.defaultLevel ?? "info";
    this.createEntry = createEntryFactory(this.serviceName);
  }

  private shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[this.defaultLevel];
  }

  private requireBuffer() {
    if (!this.buffer) throw new Error("Logging unit not initialized");
    return this.buffer;
  }

  private requireQueryService() {
    if (!this.queryService) throw new Error("Logging unit not initialized");
    return this.queryService;
  }

  private enqueue(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (!this.shouldLog(level)) return;
    this.requireBuffer().push(
      this.createEntry(level, message, metadata, error),
    );
  }

  async initialize(deps: UnitDeps): Promise<void> {
    this.pool = deps.pool;
    this.db = createDrizzle(deps.pool, schema);
    this.queryService = new LogQueryService(this.db);

    this.buffer = createLogBuffer(100, async (entries) => {
      await this.db?.insert(schema.logs).values(
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

    await this.pool.query(`
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

    this.flushTimer = setInterval(() => this.buffer?.flush(), 5000);
  }

  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.buffer) {
      await this.buffer.drain();
      this.buffer = null;
    }
    this.queryService = null;
    this.db = null;
    this.pool = null;
  }

  async healthCheck(): Promise<boolean> {
    return this.db !== null;
  }

  child(context: Record<string, unknown>): ChildLogger {
    const mergeMeta = (meta?: Record<string, unknown>) => ({
      ...context,
      ...meta,
    });
    return {
      debug: (message, metadata) =>
        this.enqueue("debug", message, mergeMeta(metadata)),
      error: (message, err, metadata) => {
        if (this.shouldLog("error"))
          this.requireBuffer().push(
            this.createEntry("error", message, mergeMeta(metadata), err),
          );
      },
      fatal: (message, err, metadata) =>
        this.requireBuffer().push(
          this.createEntry("fatal", message, mergeMeta(metadata), err),
        ),
      info: (message, metadata) =>
        this.enqueue("info", message, mergeMeta(metadata)),
      log: (level, message, metadata) =>
        this.enqueue(level, message, mergeMeta(metadata)),
      warn: (message, metadata) =>
        this.enqueue("warn", message, mergeMeta(metadata)),
    };
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.enqueue("debug", message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.enqueue("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.enqueue("warn", message, metadata);
  }

  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    if (this.shouldLog("error"))
      this.requireBuffer().push(
        this.createEntry("error", message, metadata, error),
      );
  }

  fatal(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    this.requireBuffer().push(
      this.createEntry("fatal", message, metadata, error),
    );
  }

  log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.enqueue(level, message, metadata);
  }

  async getStats(
    service?: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<import("./types").LogStats> {
    return this.requireQueryService().getStats(service, startTime, endTime);
  }

  async query(
    filter: import("./types").LogQuery,
  ): Promise<import("./types").LogEntry[]> {
    return this.requireQueryService().query(filter);
  }
}
