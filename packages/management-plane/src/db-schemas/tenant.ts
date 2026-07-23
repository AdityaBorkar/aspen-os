import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { TENANT_STATUS } from "../constants";

export const tenantStatusEnum = pgEnum("tenant_status", [
  TENANT_STATUS.ACTIVE,
  TENANT_STATUS.CHURNED,
  TENANT_STATUS.ONBOARDING,
  TENANT_STATUS.SUSPENDED,
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

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;
