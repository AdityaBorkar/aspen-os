import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { logs } from "./db-schema";
import type { LogEntry, LogLevel, LogQuery, LogStats } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export class LogQueryService {
  private db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.db = db;
  }

  async query(filter: LogQuery): Promise<LogEntry[]> {
    const conditions = [];
    if (filter.level) conditions.push(eq(logs.level, filter.level));
    if (filter.service) conditions.push(eq(logs.service, filter.service));
    if (filter.startTime)
      conditions.push(gte(logs.timestamp, filter.startTime));
    if (filter.endTime) conditions.push(lte(logs.timestamp, filter.endTime));
    if (filter.traceId) conditions.push(eq(logs.traceId, filter.traceId));
    if (filter.userId) conditions.push(eq(logs.userId, filter.userId));
    if (filter.search)
      conditions.push(ilike(logs.message, `%${filter.search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(logs)
      .where(where)
      .orderBy(desc(logs.timestamp))
      .limit(filter.limit ?? 100)
      .offset(filter.offset ?? 0);

    return rows.map((row) => ({
      duration: row.durationMs ?? undefined,
      error: row.errorName
        ? {
            message: row.errorMessage ?? "",
            name: row.errorName,
            stack: row.errorStack ?? undefined,
          }
        : undefined,
      id: row.id,
      level: row.level as LogLevel,
      message: row.message,
      metadata: row.metadata as Record<string, unknown>,
      requestId: row.requestId ?? undefined,
      service: row.service,
      spanId: row.spanId ?? undefined,
      timestamp: row.timestamp,
      traceId: row.traceId ?? undefined,
      userId: row.userId ?? undefined,
    }));
  }

  async getStats(
    service?: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<LogStats> {
    const conditions = [];
    if (service) conditions.push(eq(logs.service, service));
    if (startTime) conditions.push(gte(logs.timestamp, startTime));
    if (endTime) conditions.push(lte(logs.timestamp, endTime));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        level: logs.level,
      })
      .from(logs)
      .where(where)
      .groupBy(logs.level);

    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      error: 0,
      fatal: 0,
      info: 0,
      warn: 0,
    };
    let total = 0;
    for (const row of rows) {
      byLevel[row.level as LogLevel] = row.count;
      total += row.count;
    }

    return {
      byLevel,
      errorRate: total > 0 ? (byLevel.error + byLevel.fatal) / total : 0,
      total,
    };
  }
}
