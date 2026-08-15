import type { JsonValue } from "#/server/types";
import { uuidv7 } from "#/server/utils/uuidv7";

import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const auditLog = pgTable(
  "audit_log",
  {
    action: text("action").notNull(),
    actorId: text("actor_id").notNull(),
    changes: jsonb("changes").$type<Record<string, JsonValue> | null>(),
    crudAction: text("crud_action"),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue> | null>(),
    newState: jsonb("new_state").$type<Record<string, JsonValue> | null>(),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
    previousState: jsonb("previous_state").$type<Record<string, JsonValue> | null>(),
    requestId: text("request_id"),
    seq: bigserial("seq", { mode: "number" }),
    tenantId: text("tenant_id")
      .notNull()
      .default(sql`COALESCE(current_setting('app.tenant_id', true), 'default')`),
    traceId: text("trace_id"),
    workflowRunId: text("workflow_run_id"),
  },
  (table) => [
    uniqueIndex("idx_audit_log_idempotency").on(table.tenantId, table.idempotencyKey),
    index("idx_audit_log_entity_seq").on(table.entityType, table.entityId, table.seq),
    index("idx_audit_log_workflow").on(table.workflowRunId),
    index("idx_audit_log_actor").on(table.actorId),
    index("idx_audit_log_action").on(table.action),
    index("idx_audit_log_performed_at").on(table.performedAt),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
