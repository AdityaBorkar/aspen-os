import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../constants";

export const auditActionEnum = pgEnum("audit_action", [
  AUDIT_ACTION.TENANT_PROVISIONED,
  AUDIT_ACTION.TENANT_ACTIVATED,
  AUDIT_ACTION.TENANT_SUSPENDED,
  AUDIT_ACTION.TENANT_REACTIVATED,
  AUDIT_ACTION.TENANT_CHURNED,
  AUDIT_ACTION.TENANT_PROFILE_UPDATED,
  AUDIT_ACTION.SP_ASSIGNED,
  AUDIT_ACTION.SP_UNASSIGNED,
  AUDIT_ACTION.SP_CREATED,
  AUDIT_ACTION.SP_UPDATED,
  AUDIT_ACTION.SP_DEACTIVATED,
  AUDIT_ACTION.SP_ACTIVATED,
  AUDIT_ACTION.PLATFORM_USER_CREATED,
  AUDIT_ACTION.PLATFORM_USER_UPDATED,
  AUDIT_ACTION.PLATFORM_USER_DELETED,
  AUDIT_ACTION.ROLE_ASSIGNED,
  AUDIT_ACTION.SP_ASSIGNED_TO_USER,
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  AUDIT_ENTITY_TYPE.TENANT,
  AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
  AUDIT_ENTITY_TYPE.PLATFORM_USER,
]);

export const auditLog = pgTable(
  "audit_log",
  {
    action: auditActionEnum("action").notNull(),
    actorId: text("actor_id").notNull(),
    changes: jsonb("changes"),
    entityId: text("entity_id").notNull(),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    metadata: jsonb("metadata"),
    newState: jsonb("new_state"),
    performedAt: timestamp("performed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    previousState: jsonb("previous_state"),
  },
  (table) => [
    index("idx_audit_log_actor").on(table.actorId),
    index("idx_audit_log_action").on(table.action),
    index("idx_audit_log_entity").on(table.entityType, table.entityId),
    index("idx_audit_log_performed_at").on(table.performedAt),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
