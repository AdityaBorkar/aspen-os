import { auditLog } from "#/server/audit/db-schema";
import type { AuditDatabase, AuditQuery } from "#/server/audit/types";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export class AuditQueryService {
  private readonly db: AuditDatabase;

  constructor(db: AuditDatabase) {
    this.db = db;
  }

  async query(filter: AuditQuery): Promise<unknown[]> {
    const conditions = [];
    if (filter.action) {
      conditions.push(eq(auditLog.action, filter.action));
    }
    if (filter.actorId) {
      conditions.push(eq(auditLog.actorId, filter.actorId));
    }
    if (filter.crudAction) {
      conditions.push(eq(auditLog.crudAction, filter.crudAction));
    }
    if (filter.entityType) {
      conditions.push(eq(auditLog.entityType, filter.entityType));
    }
    if (filter.entityId) {
      conditions.push(eq(auditLog.entityId, filter.entityId));
    }
    if (filter.workflowRunId) {
      conditions.push(eq(auditLog.workflowRunId, filter.workflowRunId));
    }
    if (filter.tenantId) {
      conditions.push(eq(auditLog.tenantId, filter.tenantId));
    }
    if (filter.startTime) {
      conditions.push(gte(auditLog.performedAt, filter.startTime));
    }
    if (filter.endTime) {
      conditions.push(lte(auditLog.performedAt, filter.endTime));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.seq))
      .limit(filter.limit ?? 100)
      .offset(filter.offset ?? 0);
  }

  /** Reconstruct a record's current state by replaying its audited changes in seq order. */
  async reconstructState(
    entityType: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    const rows = await this.db
      .select({
        crudAction: auditLog.crudAction,
        newState: auditLog.newState,
      })
      .from(auditLog)
      .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
      .orderBy(auditLog.seq);

    if (rows.length === 0) {
      return null;
    }

    let state: Record<string, unknown> | null = null;
    for (const row of rows) {
      if (row.crudAction === "delete") {
        state = null;
      } else if (row.newState) {
        state = row.newState as Record<string, unknown>;
      }
    }
    return state;
  }

  async count(filter: AuditQuery): Promise<number> {
    const conditions = [];
    if (filter.action) {
      conditions.push(eq(auditLog.action, filter.action));
    }
    if (filter.actorId) {
      conditions.push(eq(auditLog.actorId, filter.actorId));
    }
    if (filter.crudAction) {
      conditions.push(eq(auditLog.crudAction, filter.crudAction));
    }
    if (filter.entityType) {
      conditions.push(eq(auditLog.entityType, filter.entityType));
    }
    if (filter.entityId) {
      conditions.push(eq(auditLog.entityId, filter.entityId));
    }
    if (filter.workflowRunId) {
      conditions.push(eq(auditLog.workflowRunId, filter.workflowRunId));
    }
    if (filter.tenantId) {
      conditions.push(eq(auditLog.tenantId, filter.tenantId));
    }
    if (filter.startTime) {
      conditions.push(gte(auditLog.performedAt, filter.startTime));
    }
    if (filter.endTime) {
      conditions.push(lte(auditLog.performedAt, filter.endTime));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(where);

    return result[0]?.count ?? 0;
  }
}
