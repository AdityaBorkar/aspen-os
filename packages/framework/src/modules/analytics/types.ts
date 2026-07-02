import type { DatabaseConfig } from "../../lib/types";

export type GroupByInterval = "hour" | "day" | "week" | "month";

export interface AnalyticsConfig {
	database: DatabaseConfig;
	retentionDays?: number;
}

export interface AnalyticsEvent {
	id: string;
	name: string;
	properties: Record<string, unknown>;
	userId?: string;
	sessionId?: string;
	timestamp: Date;
}

export interface TrackInput {
	name: string;
	properties?: Record<string, unknown>;
	userId?: string;
	sessionId?: string;
	timestamp?: Date;
}

export interface AnalyticsQuery {
	name?: string;
	userId?: string;
	sessionId?: string;
	startTime?: Date;
	endTime?: Date;
	groupBy?: GroupByInterval;
	limit?: number;
}

export interface AnalyticsResult {
	events: AnalyticsEvent[];
	aggregations?: Aggregation[];
}

export interface Aggregation {
	period: string;
	count: number;
	uniqueUsers: number;
}

export interface TopEvent {
	name: string;
	count: number;
}

export interface AnalyticsModule {
	initialize(): Promise<void>;
	destroy(): Promise<void>;

	track(event: TrackInput): Promise<AnalyticsEvent>;
	trackBatch(events: TrackInput[]): Promise<void>;

	query(filter: AnalyticsQuery): Promise<AnalyticsResult>;
	getEventCount(
		name: string,
		startTime?: Date,
		endTime?: Date,
	): Promise<number>;
	getUniqueUsers(
		name: string,
		startTime?: Date,
		endTime?: Date,
	): Promise<number>;
	getTopEvents(
		limit?: number,
		startTime?: Date,
		endTime?: Date,
	): Promise<TopEvent[]>;
	getUserActivity(
		userId: string,
		startTime?: Date,
		endTime?: Date,
	): Promise<AnalyticsEvent[]>;
}
