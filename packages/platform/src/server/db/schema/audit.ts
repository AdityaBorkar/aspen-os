import { uuidv7 } from "#/server/db/schema/data-types";
import type { JsonValue } from "#/server/types";

import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const auditLog = pgTable(
  "audit_log",
  {
    action: text().notNull(),
    actor_id: text().notNull(),
    changes: jsonb().$type<Record<string, JsonValue> | null>(),
    crud_action: text(),
    entity_id: text().notNull(),
    entity_type: text().notNull(),
    id: uuidv7().primaryKey(),
    idempotency_key: text(),
    metadata: jsonb().$type<Record<string, JsonValue> | null>(),
    new_state: jsonb().$type<Record<string, JsonValue> | null>(),
    performed_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    previous_state: jsonb().$type<Record<string, JsonValue> | null>(),
    request_id: text(),
    seq: bigserial({ mode: "number" }),
    tenant_id: text()
      .notNull()
      .default(sql`COALESCE(current_setting('app.tenant_id', true), 'default')`),
    trace_id: text(),
    workflow_run_id: text(),
  },
  (table) => [
    uniqueIndex("idx_audit_log_idempotency").on(table.tenant_id, table.idempotency_key),
    index("idx_audit_log_entity_seq").on(table.entity_type, table.entity_id, table.seq),
    index("idx_audit_log_workflow").on(table.workflow_run_id),
    index("idx_audit_log_actor").on(table.actor_id),
    index("idx_audit_log_action").on(table.action),
    index("idx_audit_log_performed_at").on(table.performed_at),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
