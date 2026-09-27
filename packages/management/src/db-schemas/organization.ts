import { TENANT_STATUS } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", [
  TENANT_STATUS.ACTIVE,
  TENANT_STATUS.CHURNED,
  TENANT_STATUS.ONBOARDING,
  TENANT_STATUS.SUSPENDED,
]);

/**
 * Control-plane companion to a better-auth `organization` row, sharing its
 * primary key 1:1. Holds what better-auth does not: branding, lifecycle
 * status, plan, service-provider assignment, and signup/suspension stamps.
 * `name`, `slug`, `logo`, and `createdAt` live on the better-auth organization.
 */
export const managedOrganization = pgTable(
  "managed_organization",
  {
    branding: jsonb().$type<JsonValue | null>(),
    id: text()
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    plan: text(),
    service_provider_id: text(),
    signup_at: timestamp({ withTimezone: true }).notNull(),
    status: tenantStatusEnum().notNull().default("onboarding"),
    suspended_at: timestamp({ withTimezone: true }),
    suspended_reason: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_managed_organization_status").on(table.status),
    index("idx_managed_organization_service_provider").on(table.service_provider_id),
    index("idx_managed_organization_plan").on(table.plan),
  ],
);

export type ManagedOrganization = typeof managedOrganization.$inferSelect;
export type NewManagedOrganization = typeof managedOrganization.$inferInsert;
