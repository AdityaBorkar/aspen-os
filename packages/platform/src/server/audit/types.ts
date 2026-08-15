import type { JsonValue } from "#/server/types";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type AuditDatabase = NodePgDatabase;

export type CrudAction = "create" | "update" | "delete";

export interface AuditEntry {
  action: string;
  actorId?: string;
  changes?: Record<string, JsonValue>;
  crudAction?: CrudAction;
  entityId: string;
  entityType: string;
  idempotencyKey?: string;
  metadata?: Record<string, JsonValue>;
  newState?: Record<string, JsonValue> | null;
  previousState?: Record<string, JsonValue> | null;
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
