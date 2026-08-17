import type { JsonValue } from "#/server/types";
import { context } from "#/server/utils";

import { context as otelContext, trace } from "@opentelemetry/api";
import pino from "pino";
import pretty from "pino-pretty";
import { number, safeParse, string } from "valibot";

import type { LogEntry, LogLevel } from "./types";

export interface CreateEntryInput {
  error?: Error;
  level: LogLevel;
  message: string;
  metadata?: Record<string, JsonValue>;
}

export interface LogBuffer {
  drain: () => Promise<void>;
  flush: () => Promise<void>;
  push: (entry: LogEntry) => void;
  size: () => number;
}

export function createLogBuffer(
  bufferSize: number,
  flushFn: (entries: LogEntry[]) => Promise<void>,
): LogBuffer {
  const buffer: LogEntry[] = [];
  let flushing = false;

  function push(entry: LogEntry): void {
    buffer.push(entry);
    if (buffer.length >= bufferSize && !flushing) {
      void flush();
    }
  }

  async function flush(): Promise<void> {
    if (buffer.length === 0 || flushing) {
      return;
    }
    flushing = true;
    const entries = buffer.splice(0, bufferSize);
    try {
      await flushFn(entries);
    } catch {
      // Buffer flush failure is non-critical
    } finally {
      flushing = false;
    }
  }

  async function drain(): Promise<void> {
    await flush();
  }

  function size(): number {
    return buffer.length;
  }

  return { drain, flush, push, size };
}

export function createEntryFactory(serviceName: string) {
  return function createEntry(input: CreateEntryInput): LogEntry {
    const { error, level, message, metadata } = input;
    const ctx = context.getStore();
    return {
      duration: toOptionalNumber(metadata?.duration),
      error: error ? { message: error.message, name: error.name, stack: error.stack } : undefined,
      id: crypto.randomUUID(),
      level,
      message,
      metadata,
      requestId: toOptionalString(metadata?.requestId),
      service: serviceName,
      spanId: toOptionalString(metadata?.spanId),
      tenantId: ctx?.tenantId,
      timestamp: new Date(),
      traceId: toOptionalString(metadata?.traceId),
      userId: toOptionalString(metadata?.userId),
    };
  };
}

function toOptionalNumber(value: JsonValue | undefined): number | undefined {
  const result = safeParse(number(), value);
  return result.success ? result.output : undefined;
}

function toOptionalString(value: JsonValue | undefined): string | undefined {
  const result = safeParse(string(), value);
  return result.success ? result.output : undefined;
}

const baseEnv = process.env.NODE_ENV;
if (!baseEnv) {
  throw new Error("NODE_ENV is not set");
}

const serviceName = process.env.OTEL_SERVICE_NAME;
if (!serviceName) {
  throw new Error("OTEL_SERVICE_NAME is not set");
}

export const logger = pino(
  {
    base: {
      env: baseEnv,
      service: serviceName,
    },
    level: process.env.LOG_LEVEL || "info",
    mixin() {
      const span = trace.getSpan(otelContext.active());
      if (!span) {
        return {};
      }
      const { traceId, spanId } = span.spanContext();
      return { span_id: spanId, trace_id: traceId };
    },
  },
  baseEnv === "development"
    ? pretty({
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "SYS:HH:MM:ss",
      })
    : undefined,
);
