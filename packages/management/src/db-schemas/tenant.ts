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
    churn_reason: text(),
    churned_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    database_host: text(),
    database_name: text(),
    database_password: text(),
    database_port: integer(),
    database_ssl: boolean(),
    database_user: text(),
    id: text().primaryKey(),
    plan: text(),
    service_provider_id: text(),
    signup_at: timestamp({ withTimezone: true }).notNull(),
    status: tenantStatusEnum().notNull().default("onboarding"),
    suspended_at: timestamp({ withTimezone: true }),
    suspended_reason: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_tenant_status").on(table.status),
    index("idx_tenant_service_provider").on(table.service_provider_id),
    index("idx_tenant_plan").on(table.plan),
  ],
);

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;
