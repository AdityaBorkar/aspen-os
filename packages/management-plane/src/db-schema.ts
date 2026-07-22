import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  SP_STATUS,
  TENANT_STATUS,
} from "./constants";

export const tenantStatusEnum = pgEnum("tenant_status", [
  TENANT_STATUS.ACTIVE,
  TENANT_STATUS.CHURNED,
  TENANT_STATUS.ONBOARDING,
  TENANT_STATUS.SUSPENDED,
]);

export const serviceProviderStatusEnum = pgEnum("service_provider_status", [
  SP_STATUS.ACTIVE,
  SP_STATUS.INACTIVE,
]);

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

export const tenant = pgTable(
  "tenant",
  {
    churnedAt: timestamp("churned_at", { withTimezone: true }),
    churnReason: text("churn_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    databaseHost: text("database_host").notNull(),
    databaseName: text("database_name").notNull(),
    databasePassword: text("database_password").notNull(),
    databasePort: integer("database_port").notNull(),
    databaseSsl: boolean("database_ssl").notNull(),
    databaseUser: text("database_user").notNull(),
    id: text("id").primaryKey(),
    plan: text("plan"),
    serviceProviderId: text("service_provider_id"),
    signupAt: timestamp("signup_at", { withTimezone: true }).notNull(),
    status: tenantStatusEnum("status").notNull().default("onboarding"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_tenant_status").on(table.status),
    index("idx_tenant_service_provider").on(table.serviceProviderId),
    index("idx_tenant_plan").on(table.plan),
  ],
);

export const serviceProvider = pgTable(
  "service_provider",
  {
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    email: text("email"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    logo: text("logo"),
    name: text("name").notNull(),
    phone: text("phone"),
    slug: text("slug").notNull().unique(),
    status: serviceProviderStatusEnum("status").notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    website: text("website"),
  },
  (table) => [index("idx_service_provider_status").on(table.status)],
);

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

export const organization = pgTable("organization", {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  id: text("id").primaryKey(),
  logo: text("logo"),
  metadata: jsonb("metadata"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const member = pgTable(
  "member",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    role: text("role").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_member_organization").on(table.organizationId),
    index("idx_member_user").on(table.userId),
  ],
);

export const session = pgTable(
  "session",
  {
    activeOrganizationId: text("active_organization_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
  },
  (table) => [index("idx_session_active_org").on(table.activeOrganizationId)],
);

export const user = pgTable("user", {
  createdAt: timestamp("created_at").notNull(),
  email: text("email").notNull(),
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  spId: text("sp_id"),
  updatedAt: timestamp("updated_at").notNull(),
});

export const managementPlaneTables = {
  auditLog,
  serviceProvider,
  tenant,
} as const;

export type Tenant = typeof tenant.$inferSelect;
export type ServiceProvider = typeof serviceProvider.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type Member = typeof member.$inferSelect;

export type NewTenant = typeof tenant.$inferInsert;
export type NewServiceProvider = typeof serviceProvider.$inferInsert;
export type NewAuditLog = typeof auditLog.$inferInsert;
