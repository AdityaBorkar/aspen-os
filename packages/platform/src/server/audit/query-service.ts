import { auditLog } from "#/server/db/schema";
import type { AuditLog } from "#/server/db/schema";
import type { JsonValue } from "#/server/types";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import type { AuditDatabase, AuditQuery } from "./types";

export class AuditQueryService {
  private readonly db: AuditDatabase;

  constructor(db: AuditDatabase) {
    this.db = db;
  }

  async query(filter: AuditQuery): Promise<AuditLog[]> {
    const conditions = [];
    if (filter.action) {
      conditions.push(eq(auditLog.action, filter.action));
    }
    if (filter.actorId) {
      conditions.push(eq(auditLog.actor_id, filter.actorId));
    }
    if (filter.crudAction) {
      conditions.push(eq(auditLog.crud_action, filter.crudAction));
    }
    if (filter.entityType) {
      conditions.push(eq(auditLog.entity_type, filter.entityType));
    }
    if (filter.entityId) {
      conditions.push(eq(auditLog.entity_id, filter.entityId));
    }
    if (filter.workflowRunId) {
      conditions.push(eq(auditLog.workflow_run_id, filter.workflowRunId));
    }
    if (filter.tenantId) {
      conditions.push(eq(auditLog.tenant_id, filter.tenantId));
    }
    if (filter.startTime) {
      conditions.push(gte(auditLog.performed_at, filter.startTime));
    }
    if (filter.endTime) {
      conditions.push(lte(auditLog.performed_at, filter.endTime));
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
  ): Promise<Record<string, JsonValue> | null> {
    const rows = await this.db
      .select({
        crudAction: auditLog.crud_action,
        newState: auditLog.new_state,
      })
      .from(auditLog)
      .where(and(eq(auditLog.entity_type, entityType), eq(auditLog.entity_id, entityId)))
      .orderBy(auditLog.seq);

    if (rows.length === 0) {
      return null;
    }

    let state: Record<string, JsonValue> | null = null;
    for (const row of rows) {
      if (row.crudAction === "delete") {
        state = null;
      } else if (row.newState) {
        state = row.newState;
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
      conditions.push(eq(auditLog.actor_id, filter.actorId));
    }
    if (filter.crudAction) {
      conditions.push(eq(auditLog.crud_action, filter.crudAction));
    }
    if (filter.entityType) {
      conditions.push(eq(auditLog.entity_type, filter.entityType));
    }
    if (filter.entityId) {
      conditions.push(eq(auditLog.entity_id, filter.entityId));
    }
    if (filter.workflowRunId) {
      conditions.push(eq(auditLog.workflow_run_id, filter.workflowRunId));
    }
    if (filter.tenantId) {
      conditions.push(eq(auditLog.tenant_id, filter.tenantId));
    }
    if (filter.startTime) {
      conditions.push(gte(auditLog.performed_at, filter.startTime));
    }
    if (filter.endTime) {
      conditions.push(lte(auditLog.performed_at, filter.endTime));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(where);

    return result[0]?.count ?? 0;
  }
}
