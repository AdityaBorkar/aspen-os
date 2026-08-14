import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { DatabaseUnit } from "../db";
import { context } from "../utils/context";
import { logs } from "./db-schema";
import { type CreateEntryInput, createEntryFactory, createLogBuffer } from "./log-buffer";
import { LogQueryService } from "./query-service";
import {
  type ChildLogger,
  type LogConfig,
  type LogEntry,
  type LogLevel,
  type LogQuery,
  type LogStats,
  LEVEL_PRIORITY as levelPriority,
} from "./types";

export { LogQueryService } from "./query-service";
export type { ChildLogger, LogConfig, LogEntry, LogLevel, LogQuery, LogStats } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export class LogUnit {
  readonly $name = "logs";

  private serviceName: string;
  private defaultLevel: LogLevel;
  private db: DrizzleDB;
  private queryService: LogQueryService;
  private buffer: ReturnType<typeof createLogBuffer>;
  private flushTimer: ReturnType<typeof setInterval>;
  private createEntry: (input: CreateEntryInput) => LogEntry;

  constructor(
    config: LogConfig,
    // Biome-ignore lint/suspicious/noExplicitAny: drizzle NodePgDatabase invariance forces any here
    { db }: { db: DatabaseUnit<any> },
  ) {
    this.serviceName = config.serviceName ?? "app";
    this.defaultLevel = config.defaultLevel ?? "info";
    this.createEntry = createEntryFactory(this.serviceName);
    this.db = db.db as DrizzleDB;
    this.queryService = new LogQueryService(this.db);

    this.buffer = createLogBuffer(100, async (entries) => {
      await this.db.insert(logs).values(
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
          tenantId: entry.tenantId ?? "default",
          timestamp: entry.timestamp,
          traceId: entry.traceId ?? null,
          userId: entry.userId ?? null,
        })),
      );
    });
    this.flushTimer = setInterval(() => this.buffer?.flush(), 5000);
  }

  async $prepareInfra(): Promise<void> {
    return;
  }

  async $cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (this.buffer) {
      await this.buffer.drain();
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[this.defaultLevel];
  }

  private requireBuffer() {
    if (!this.buffer) {
      throw new Error("Logging unit not initialized");
    }
    return this.buffer;
  }

  private requireQueryService() {
    return this.queryService;
  }

  private enqueue(input: CreateEntryInput): void {
    const { level, message, metadata, error } = input;
    if (!this.shouldLog(level)) {
      return;
    }
    this.requireBuffer().push(this.createEntry({ error, level, message, metadata }));
  }

  child(contextData: Record<string, unknown>): ChildLogger {
    const mergeMeta = (meta?: Record<string, unknown>) => ({
      ...contextData,
      ...meta,
    });
    return {
      debug: (message, metadata) =>
        this.enqueue({ level: "debug", message, metadata: mergeMeta(metadata) }),
      error: (message, err, metadata) => {
        if (this.shouldLog("error")) {
          this.requireBuffer().push(
            this.createEntry({
              error: err,
              level: "error",
              message,
              metadata: mergeMeta(metadata),
            }),
          );
        }
      },
      fatal: (message, err, metadata) =>
        this.requireBuffer().push(
          this.createEntry({ error: err, level: "fatal", message, metadata: mergeMeta(metadata) }),
        ),
      info: (message, metadata) =>
        this.enqueue({ level: "info", message, metadata: mergeMeta(metadata) }),
      log: (level, message, metadata) =>
        this.enqueue({ level, message, metadata: mergeMeta(metadata) }),
      warn: (message, metadata) =>
        this.enqueue({ level: "warn", message, metadata: mergeMeta(metadata) }),
    };
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.enqueue({ level: "debug", message, metadata });
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.enqueue({ level: "info", message, metadata });
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.enqueue({ level: "warn", message, metadata });
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      this.requireBuffer().push(this.createEntry({ error, level: "error", message, metadata }));
    }
  }

  fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.requireBuffer().push(this.createEntry({ error, level: "fatal", message, metadata }));
  }

  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    this.enqueue({ level, message, metadata });
  }

  async getStats(filter?: {
    service?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LogStats> {
    const tenantId = context.getStore()?.tenantId;
    return this.requireQueryService().getStats({ ...filter, tenantId });
  }

  async query(filter: LogQuery): Promise<LogEntry[]> {
    const tenantId = context.getStore()?.tenantId;
    return this.requireQueryService().query({ ...filter, tenantId });
  }
}
