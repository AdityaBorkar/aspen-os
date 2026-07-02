import { getDrizzle, getPool } from "../../lib/db";
import * as schema from "./schema";
import { createAnalyticsQueryService } from "./service";
import type {
	AnalyticsConfig,
	AnalyticsEvent,
	AnalyticsModule,
	TrackInput,
} from "./types";

export type {
	Aggregation,
	AnalyticsConfig,
	AnalyticsEvent,
	AnalyticsModule,
	AnalyticsQuery,
	AnalyticsResult,
	GroupByInterval,
	TopEvent,
	TrackInput,
} from "./types";

export function createAnalyticsModule(
	config: AnalyticsConfig,
): AnalyticsModule {
	const pool = getPool(config.database);
	const db = getDrizzle(config.database, schema);
	const queryService = createAnalyticsQueryService(db);

	async function initialize(): Promise<void> {
		await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        properties JSONB DEFAULT '{}',
        user_id TEXT,
        session_id TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      SELECT create_hypertable('analytics_events', 'timestamp', if_not_exists => TRUE);

      CREATE INDEX IF NOT EXISTS idx_analytics_name ON analytics_events(name);
      CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);

      SELECT add_retention_policy('analytics_events', INTERVAL '${config.retentionDays ?? 365} days', if_not_exists => TRUE);
    `);
	}

	async function destroy(): Promise<void> {}

	async function track(event: TrackInput): Promise<AnalyticsEvent> {
		const [row] = await db
			.insert(schema.analyticsEvents)
			.values({
				name: event.name,
				properties: event.properties ?? {},
				userId: event.userId ?? null,
				sessionId: event.sessionId ?? null,
				timestamp: event.timestamp ?? new Date(),
			})
			.returning();

		return {
			id: row!.id,
			name: row!.name,
			properties: row!.properties as Record<string, unknown>,
			userId: row!.userId ?? undefined,
			sessionId: row!.sessionId ?? undefined,
			timestamp: row!.timestamp,
		};
	}

	async function trackBatch(events: TrackInput[]): Promise<void> {
		await db.insert(schema.analyticsEvents).values(
			events.map((event) => ({
				name: event.name,
				properties: event.properties ?? {},
				userId: event.userId ?? null,
				sessionId: event.sessionId ?? null,
				timestamp: event.timestamp ?? new Date(),
			})),
		);
	}

	return {
		initialize,
		destroy,
		track,
		trackBatch,
		query: queryService.query,
		getEventCount: queryService.getEventCount,
		getUniqueUsers: queryService.getUniqueUsers,
		getTopEvents: queryService.getTopEvents,
		getUserActivity: queryService.getUserActivity,
	};
}
