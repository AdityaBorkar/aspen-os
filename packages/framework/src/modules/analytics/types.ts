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
  sessionId?: string;
  timestamp: Date;
  userId?: string;
}

export interface TrackInput {
  name: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
  timestamp?: Date;
  userId?: string;
}

export interface AnalyticsQuery {
  endTime?: Date;
  groupBy?: GroupByInterval;
  limit?: number;
  name?: string;
  sessionId?: string;
  startTime?: Date;
  userId?: string;
}

export interface AnalyticsResult {
  aggregations?: Aggregation[];
  events: AnalyticsEvent[];
}

export interface Aggregation {
  count: number;
  period: string;
  uniqueUsers: number;
}

export interface TopEvent {
  count: number;
  name: string;
}

export interface AnalyticsModule {
  destroy(): Promise<void>;
  getEventCount(
    name: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<number>;
  getTopEvents(
    limit?: number,
    startTime?: Date,
    endTime?: Date,
  ): Promise<TopEvent[]>;
  getUniqueUsers(
    name: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<number>;
  getUserActivity(
    userId: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<AnalyticsEvent[]>;
  initialize(): Promise<void>;

  query(filter: AnalyticsQuery): Promise<AnalyticsResult>;

  track(event: TrackInput): Promise<AnalyticsEvent>;
  trackBatch(events: TrackInput[]): Promise<void>;
}
