import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type AuditDatabase = NodePgDatabase<Record<string, never>>;

export type CrudAction = "create" | "update" | "delete";

export interface AuditEntry {
  action: string;
  actorId?: string;
  changes?: Record<string, unknown>;
  crudAction?: CrudAction;
  entityId: string;
  entityType: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  newState?: Record<string, unknown> | null;
  previousState?: Record<string, unknown> | null;
  requestId?: string;
  traceId?: string;
  workflowRunId?: string;
}

export interface AuditQuery {
  action?: string;
  actorId?: string;
  crudAction?: CrudAction;
  endTime?: Date;
  entityId?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
  startTime?: Date;
  tenantId?: string;
  workflowRunId?: string;
}
