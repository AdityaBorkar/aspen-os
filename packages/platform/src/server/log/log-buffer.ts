import { context } from "../context";
import type { LogEntry, LogLevel } from "./types";

export interface LogBuffer {
  drain(): Promise<void>;
  flush(): Promise<void>;
  push(entry: LogEntry): void;
  size(): number;
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
      flush();
    }
  }

  async function flush(): Promise<void> {
    if (buffer.length === 0 || flushing) return;
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
  return function createEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
  ): LogEntry {
    const ctx = context.getStore();
    return {
      duration: metadata?.duration as number | undefined,
      error: error
        ? { message: error.message, name: error.name, stack: error.stack }
        : undefined,
      id: crypto.randomUUID(),
      level,
      message,
      metadata,
      requestId: metadata?.requestId as string | undefined,
      service: serviceName,
      spanId: metadata?.spanId as string | undefined,
      tenantId: ctx?.tenantId,
      timestamp: new Date(),
      traceId: metadata?.traceId as string | undefined,
      userId: metadata?.userId as string | undefined,
    };
  };
}
