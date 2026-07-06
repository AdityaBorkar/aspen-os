import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

import type { DatabaseUnit } from "../db";
import { createEntryFactory, createLogBuffer } from "./buffer";
import { logs } from "./db-schema";
import { LogQueryService } from "./query-service";
import type {
  ChildLogger,
  LogEntry,
  LoggingConfig,
  LogLevel,
  LogQuery,
  LogStats,
} from "./types";
import { LEVEL_PRIORITY as levelPriority } from "./types";

export { LogQueryService } from "./query-service";
export type {
  ChildLogger,
  LogEntry,
  LoggingConfig,
  LogLevel,
  LogQuery,
  LogStats,
} from "./types";

export class LoggingUnit {
  readonly name = "logs";

  private serviceName: string;
  private defaultLevel: LogLevel;
  private pool: Pool;
  private db: NodePgDatabase;
  private queryService: LogQueryService;
  private buffer: ReturnType<typeof createLogBuffer>;
  private flushTimer: ReturnType<typeof setInterval>;
  private createEntry: (
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
  ) => LogEntry;

  constructor(config: LoggingConfig, { db }: { db: DatabaseUnit }) {
    this.serviceName = config.serviceName ?? "app";
    this.defaultLevel = config.defaultLevel ?? "info";
    this.createEntry = createEntryFactory(this.serviceName);
    this.pool = db.pool;
    this.db = db.db;
    this.queryService = new LogQueryService(this.db);

    this.buffer = createLogBuffer(100, async (entries) => {
      await this.db?.insert(logs).values(
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
    this.flushTimer = setInterval(() => this.buffer?.flush(), 5000);
  }

  private shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[this.defaultLevel];
  }

  private requireBuffer() {
    if (!this.buffer) throw new Error("Logging unit not initialized");
    return this.buffer;
  }

  private requireQueryService() {
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

  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (this.buffer) {
      await this.buffer.drain();
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
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
  ): Promise<LogStats> {
    return this.requireQueryService().getStats(service, startTime, endTime);
  }

  async query(filter: LogQuery): Promise<LogEntry[]> {
    return this.requireQueryService().query(filter);
  }
}
