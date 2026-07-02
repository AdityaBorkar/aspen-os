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

    return { aggregations, events };
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
        count: sql<number>`count(*)::int`,
        name: s.analyticsEvents.name,
      })
      .from(s.analyticsEvents)
      .where(where)
      .groupBy(s.analyticsEvents.name)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return rows.map((row) => ({ count: row.count, name: row.name }));
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
        count: sql<number>`count(*)::int`,
        period: sql<string>`time_bucket(${groupBy}::interval, ${s.analyticsEvents.timestamp})`,
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
      count: row.count,
      period: new Date(row.period).toISOString(),
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
      sessionId: row.sessionId ?? undefined,
      timestamp: row.timestamp,
      userId: row.userId ?? undefined,
    };
  }

  return {
    getEventCount,
    getTopEvents,
    getUniqueUsers,
    getUserActivity,
    query,
  };
}
