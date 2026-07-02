import type { DatabaseConfig, UnitDeps } from "../types";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LoggingConfig {
  database: DatabaseConfig;
  defaultLevel?: LogLevel;
  serviceName?: string;
}

export interface LogEntry {
  duration?: number;
  error?: { name: string; message: string; stack?: string };
  id: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  service: string;
  spanId?: string;
  timestamp: Date;
  traceId?: string;
  userId?: string;
}

export interface LogQuery {
  endTime?: Date;
  level?: LogLevel;
  limit?: number;
  offset?: number;
  search?: string;
  service?: string;
  startTime?: Date;
  traceId?: string;
  userId?: string;
}

export interface LogStats {
  byLevel: Record<LogLevel, number>;
  errorRate: number;
  total: number;
}

export interface ChildLogger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void;
  fatal(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
  ): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
}

export interface LoggingUnit {
  child(context: Record<string, unknown>): ChildLogger;
  debug(message: string, metadata?: Record<string, unknown>): void;
  destroy(): Promise<void>;
  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void;
  fatal(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void;
  getStats(
    service?: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<LogStats>;
  info(message: string, metadata?: Record<string, unknown>): void;
  initialize(deps: UnitDeps): Promise<void>;

  log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
  ): void;

  query(filter: LogQuery): Promise<LogEntry[]>;
  warn(message: string, metadata?: Record<string, unknown>): void;
}

export const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  error: 3,
  fatal: 4,
  info: 1,
  warn: 2,
};
