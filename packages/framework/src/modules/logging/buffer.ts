import type { LogEntry, LogLevel } from "./types";

export interface LogBuffer {
	push(entry: LogEntry): void;
	flush(): Promise<void>;
	drain(): Promise<void>;
	size(): number;
}

export function createLogBuffer(
	bufferSize: number,
	flushFn: (entries: LogEntry[]) => Promise<void>,
): LogBuffer {
	const buffer: LogEntry[] = [];
	let flushTimer: ReturnType<typeof setInterval> | null = null;

	function push(entry: LogEntry): void {
		buffer.push(entry);
		if (buffer.length >= bufferSize) {
			flush();
		}
	}

	async function flush(): Promise<void> {
		if (buffer.length === 0) return;
		const entries = buffer.splice(0, bufferSize);
		try {
			await flushFn(entries);
		} catch {
			// Buffer flush failure is non-critical
		}
	}

	async function drain(): Promise<void> {
		if (flushTimer) {
			clearInterval(flushTimer);
			flushTimer = null;
		}
		await flush();
	}

	function size(): number {
		return buffer.length;
	}

	function startAutoFlush(interval: number): void {
		flushTimer = setInterval(flush, interval);
	}

	return { push, flush, drain, size };
}

export function createEntryFactory(serviceName: string) {
	return function createEntry(
		level: LogLevel,
		message: string,
		metadata?: Record<string, unknown>,
		error?: Error,
	): LogEntry {
		return {
			id: crypto.randomUUID(),
			level,
			message,
			service: serviceName,
			timestamp: new Date(),
			metadata,
			traceId: metadata?.traceId as string | undefined,
			spanId: metadata?.spanId as string | undefined,
			userId: metadata?.userId as string | undefined,
			requestId: metadata?.requestId as string | undefined,
			duration: metadata?.duration as number | undefined,
			error: error
				? { name: error.name, message: error.message, stack: error.stack }
				: undefined,
		};
	};
}
