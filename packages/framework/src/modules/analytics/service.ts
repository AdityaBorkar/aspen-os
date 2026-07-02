import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as s from "./schema";
import type {
	Aggregation,
	AnalyticsEvent,
	AnalyticsQuery,
	AnalyticsResult,
	GroupByInterval,
	TopEvent,
} from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export function createAnalyticsQueryService(db: DrizzleDB) {
	async function query(filter: AnalyticsQuery): Promise<AnalyticsResult> {
		const conditions = buildConditions(filter);
		const where = conditions.length > 0 ? and(...conditions) : undefined;
		const limit = filter.limit ?? 100;

		const rows = await db
			.select()
			.from(s.analyticsEvents)
			.where(where)
			.orderBy(desc(s.analyticsEvents.timestamp))
			.limit(limit);

		const events = rows.map(toEvent);

		let aggregations: Aggregation[] | undefined;
		if (filter.groupBy) {
			aggregations = await getAggregations(where, filter.groupBy, limit);
		}

		return { events, aggregations };
	}

	async function getEventCount(
		name: string,
		startTime?: Date,
		endTime?: Date,
	): Promise<number> {
		const conditions = [eq(s.analyticsEvents.name, name)];
		if (startTime) conditions.push(gte(s.analyticsEvents.timestamp, startTime));
		if (endTime) conditions.push(lte(s.analyticsEvents.timestamp, endTime));

		const [row] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(s.analyticsEvents)
			.where(and(...conditions));

		return row?.count ?? 0;
	}

	async function getUniqueUsers(
		name: string,
		startTime?: Date,
		endTime?: Date,
	): Promise<number> {
		const conditions = [eq(s.analyticsEvents.name, name)];
		if (startTime) conditions.push(gte(s.analyticsEvents.timestamp, startTime));
		if (endTime) conditions.push(lte(s.analyticsEvents.timestamp, endTime));

		const [row] = await db
			.select({
				count: sql<number>`count(distinct ${s.analyticsEvents.userId})::int`,
			})
			.from(s.analyticsEvents)
			.where(and(...conditions));

		return row?.count ?? 0;
	}

	async function getTopEvents(
		limit = 10,
		startTime?: Date,
		endTime?: Date,
	): Promise<TopEvent[]> {
		const conditions = [];
		if (startTime) conditions.push(gte(s.analyticsEvents.timestamp, startTime));
		if (endTime) conditions.push(lte(s.analyticsEvents.timestamp, endTime));

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const rows = await db
			.select({
				name: s.analyticsEvents.name,
				count: sql<number>`count(*)::int`,
			})
			.from(s.analyticsEvents)
			.where(where)
			.groupBy(s.analyticsEvents.name)
			.orderBy(desc(sql`count(*)`))
			.limit(limit);

		return rows.map((row) => ({ name: row.name, count: row.count }));
	}

	async function getUserActivity(
		userId: string,
		startTime?: Date,
		endTime?: Date,
	): Promise<AnalyticsEvent[]> {
		const conditions = [eq(s.analyticsEvents.userId, userId)];
		if (startTime) conditions.push(gte(s.analyticsEvents.timestamp, startTime));
		if (endTime) conditions.push(lte(s.analyticsEvents.timestamp, endTime));

		const rows = await db
			.select()
			.from(s.analyticsEvents)
			.where(and(...conditions))
			.orderBy(desc(s.analyticsEvents.timestamp))
			.limit(1000);

		return rows.map(toEvent);
	}

	async function getAggregations(
		where: ReturnType<typeof and> | undefined,
		groupBy: GroupByInterval,
		limit: number,
	): Promise<Aggregation[]> {
		const rows = await db
			.select({
				period: sql<string>`time_bucket(${groupBy}::interval, ${s.analyticsEvents.timestamp})`,
				count: sql<number>`count(*)::int`,
				uniqueUsers: sql<number>`count(distinct ${s.analyticsEvents.userId})::int`,
			})
			.from(s.analyticsEvents)
			.where(where)
			.groupBy(
				sql`time_bucket(${groupBy}::interval, ${s.analyticsEvents.timestamp})`,
			)
			.orderBy(
				desc(
					sql`time_bucket(${groupBy}::interval, ${s.analyticsEvents.timestamp})`,
				),
			)
			.limit(limit);

		return rows.map((row) => ({
			period: new Date(row.period).toISOString(),
			count: row.count,
			uniqueUsers: row.uniqueUsers,
		}));
	}

	function buildConditions(filter: AnalyticsQuery) {
		const conditions = [];
		if (filter.name) conditions.push(eq(s.analyticsEvents.name, filter.name));
		if (filter.userId)
			conditions.push(eq(s.analyticsEvents.userId, filter.userId));
		if (filter.sessionId)
			conditions.push(eq(s.analyticsEvents.sessionId, filter.sessionId));
		if (filter.startTime)
			conditions.push(gte(s.analyticsEvents.timestamp, filter.startTime));
		if (filter.endTime)
			conditions.push(lte(s.analyticsEvents.timestamp, filter.endTime));
		return conditions;
	}

	function toEvent(row: {
		id: string;
		name: string;
		properties: unknown;
		userId: string | null;
		sessionId: string | null;
		timestamp: Date;
	}): AnalyticsEvent {
		return {
			id: row.id,
			name: row.name,
			properties: row.properties as Record<string, unknown>,
			userId: row.userId ?? undefined,
			sessionId: row.sessionId ?? undefined,
			timestamp: row.timestamp,
		};
	}

	return {
		query,
		getEventCount,
		getUniqueUsers,
		getTopEvents,
		getUserActivity,
	};
}
