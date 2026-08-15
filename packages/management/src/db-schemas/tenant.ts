import { TENANT_STATUS } from "#/utils/constants";

import { boolean, index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", [
  TENANT_STATUS.ACTIVE,
  TENANT_STATUS.CHURNED,
  TENANT_STATUS.ONBOARDING,
  TENANT_STATUS.SUSPENDED,
]);

export const tenant = pgTable(
  "tenant",
  {
    churnReason: text("churn_reason"),
    churnedAt: timestamp("churned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    databaseHost: text("database_host"),
    databaseName: text("database_name"),
    databasePassword: text("database_password"),
    databasePort: integer("database_port"),
    databaseSsl: boolean("database_ssl"),
    databaseUser: text("database_user"),
    id: text("id").primaryKey(),
    plan: text("plan"),
    serviceProviderId: text("service_provider_id"),
    signupAt: timestamp("signup_at", { withTimezone: true }).notNull(),
    status: tenantStatusEnum("status").notNull().default("onboarding"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_tenant_status").on(table.status),
    index("idx_tenant_service_provider").on(table.serviceProviderId),
    index("idx_tenant_plan").on(table.plan),
  ],
);

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;
