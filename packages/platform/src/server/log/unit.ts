import type { DatabaseUnit } from "#/server/db";
import { logs } from "#/server/db/schema";
import type { JsonValue } from "#/server/types";
import { context } from "#/server/utils";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { LogQueryService } from "./query-service";
import { LEVEL_PRIORITY as levelPriority } from "./types";
import type { ChildLogger, LogConfig, LogEntry, LogLevel, LogQuery, LogStats } from "./types";
import { createEntryFactory, createLogBuffer } from "./utils";
import type { CreateEntryInput } from "./utils";

type DrizzleDB = PostgresJsDatabase;

export class LogUnit {
  readonly $name = "logs";

  private readonly serviceName: string;
  private readonly defaultLevel: LogLevel;
  private readonly db: DrizzleDB;
  private readonly queryService: LogQueryService;
  private readonly buffer: ReturnType<typeof createLogBuffer>;
  private readonly flushTimer: ReturnType<typeof setInterval>;
  private readonly createEntry: (input: CreateEntryInput) => LogEntry;

  constructor(config: LogConfig, { db }: { db: DatabaseUnit<any> }) {
    this.serviceName = config.serviceName ?? "app";
    this.defaultLevel = config.defaultLevel ?? "info";
    this.createEntry = createEntryFactory(this.serviceName);
    // SAFETY: the DatabaseUnit db is a valid postgres-js drizzle instance.
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
    this.flushTimer = setInterval(async () => this.buffer?.flush(), 5000);
  }

  async $prepareInfra(): Promise<void> {}

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

  child(contextData: Record<string, JsonValue>): ChildLogger {
    const mergeMeta = (meta?: Record<string, JsonValue>) => ({
      ...contextData,
      ...meta,
    });
    return {
      debug: (message, metadata) => {
        this.enqueue({ level: "debug", message, metadata: mergeMeta(metadata) });
      },
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
      fatal: (message, err, metadata) => {
        this.requireBuffer().push(
          this.createEntry({ error: err, level: "fatal", message, metadata: mergeMeta(metadata) }),
        );
      },
      info: (message, metadata) => {
        this.enqueue({ level: "info", message, metadata: mergeMeta(metadata) });
      },
      log: (level, message, metadata) => {
        this.enqueue({ level, message, metadata: mergeMeta(metadata) });
      },
      warn: (message, metadata) => {
        this.enqueue({ level: "warn", message, metadata: mergeMeta(metadata) });
      },
    };
  }

  debug(message: string, metadata?: Record<string, JsonValue>): void {
    this.enqueue({ level: "debug", message, metadata });
  }

  info(message: string, metadata?: Record<string, JsonValue>): void {
    this.enqueue({ level: "info", message, metadata });
  }

  warn(message: string, metadata?: Record<string, JsonValue>): void {
    this.enqueue({ level: "warn", message, metadata });
  }

  error(message: string, error?: Error, metadata?: Record<string, JsonValue>): void {
    if (this.shouldLog("error")) {
      this.requireBuffer().push(this.createEntry({ error, level: "error", message, metadata }));
    }
  }

  fatal(message: string, error?: Error, metadata?: Record<string, JsonValue>): void {
    this.requireBuffer().push(this.createEntry({ error, level: "fatal", message, metadata }));
  }

  log(level: LogLevel, message: string, metadata?: Record<string, JsonValue>): void {
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
