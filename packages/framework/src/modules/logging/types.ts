import type { DatabaseConfig } from "../../lib/types";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LoggingConfig {
	database: DatabaseConfig;
	serviceName?: string;
	defaultLevel?: LogLevel;
}

export interface LogEntry {
	id: string;
	level: LogLevel;
	message: string;
	service: string;
	timestamp: Date;
	metadata?: Record<string, unknown>;
	traceId?: string;
	spanId?: string;
	userId?: string;
	requestId?: string;
	duration?: number;
	error?: { name: string; message: string; stack?: string };
}

export interface LogQuery {
	level?: LogLevel;
	service?: string;
	startTime?: Date;
	endTime?: Date;
	traceId?: string;
	userId?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface LogStats {
	total: number;
	byLevel: Record<LogLevel, number>;
	errorRate: number;
}

export interface ChildLogger {
	log(
		level: LogLevel,
		message: string,
		metadata?: Record<string, unknown>,
	): void;
	debug(message: string, metadata?: Record<string, unknown>): void;
	info(message: string, metadata?: Record<string, unknown>): void;
	warn(message: string, metadata?: Record<string, unknown>): void;
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
}

export interface LoggingModule {
	initialize(): Promise<void>;
	destroy(): Promise<void>;

	log(
		level: LogLevel,
		message: string,
		metadata?: Record<string, unknown>,
	): void;
	debug(message: string, metadata?: Record<string, unknown>): void;
	info(message: string, metadata?: Record<string, unknown>): void;
	warn(message: string, metadata?: Record<string, unknown>): void;
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

	query(filter: LogQuery): Promise<LogEntry[]>;
	getStats(
		service?: string,
		startTime?: Date,
		endTime?: Date,
	): Promise<LogStats>;

	child(context: Record<string, unknown>): ChildLogger;
}

export const LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	fatal: 4,
};
