/** A value that survives JSON serialization (Dates become ISO strings; undefined fields are dropped). */
export type JsonValue =
  | boolean
  | number
  | string
  | null
  | undefined
  | Date
  | JsonValue[]
  | { [key: string]: JsonValue };

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  duration?: number;
  error?: { name: string; message: string; stack?: string };
  id: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, JsonValue>;
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
  debug: (message: string, metadata?: Record<string, JsonValue>) => void;
  error: (message: string, error?: Error, metadata?: Record<string, JsonValue>) => void;
  fatal: (message: string, error?: Error, metadata?: Record<string, JsonValue>) => void;
  info: (message: string, metadata?: Record<string, JsonValue>) => void;
  log: (level: LogLevel, message: string, metadata?: Record<string, JsonValue>) => void;
  warn: (message: string, metadata?: Record<string, JsonValue>) => void;
}

export interface LogUnit {
  child: (context: Record<string, JsonValue>) => ChildLogger;
  debug: (message: string, metadata?: Record<string, JsonValue>) => void;
  destroy: () => Promise<void>;
  error: (message: string, error?: Error, metadata?: Record<string, JsonValue>) => void;
  fatal: (message: string, error?: Error, metadata?: Record<string, JsonValue>) => void;
  getStats: (service?: string, startTime?: Date, endTime?: Date) => Promise<LogStats>;
  info: (message: string, metadata?: Record<string, JsonValue>) => void;

  log: (level: LogLevel, message: string, metadata?: Record<string, JsonValue>) => void;

  readonly name: string;
  query: (filter: LogQuery) => Promise<LogEntry[]>;
  warn: (message: string, metadata?: Record<string, JsonValue>) => void;
}

export const LEVEL_PRIORITY = {
  debug: 0,
  error: 3,
  fatal: 4,
  info: 1,
  warn: 2,
};
