import type {
  ChildLogger,
  LogEntry,
  LoggingConfig,
  LogLevel,
  LogQuery,
  LogStats,
} from "./types";

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

  constructor(_config: LoggingConfig, _deps?: { db?: unknown }) {
    throw new Error(
      "LoggingUnit is not supported on the client side. Use server-side framework instead.",
    );
  }

  async prepare(): Promise<void> {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  async destroy(): Promise<void> {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }

  child(_context: Record<string, unknown>): ChildLogger {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  debug(_message: string, _metadata?: Record<string, unknown>): void {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  info(_message: string, _metadata?: Record<string, unknown>): void {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  warn(_message: string, _metadata?: Record<string, unknown>): void {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  error(
    _message: string,
    _error?: Error,
    _metadata?: Record<string, unknown>,
  ): void {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  fatal(
    _message: string,
    _error?: Error,
    _metadata?: Record<string, unknown>,
  ): void {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  log(
    _level: LogLevel,
    _message: string,
    _metadata?: Record<string, unknown>,
  ): void {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  async getStats(
    _service?: string,
    _startTime?: Date,
    _endTime?: Date,
  ): Promise<LogStats> {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  async query(_filter: LogQuery): Promise<LogEntry[]> {
    throw new Error("LoggingUnit is not supported on the client side.");
  }
}
