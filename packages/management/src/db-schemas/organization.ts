import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const managedOrganization = pgTable(
  "managed_organization",
  {
    branding: jsonb().$type<JsonValue | null>(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_managed_organization_slug").on(table.slug),
    index("idx_managed_organization_name").on(table.name),
  ],
);

export type ManagedOrganization = typeof managedOrganization.$inferSelect;
export type NewManagedOrganization = typeof managedOrganization.$inferInsert;

// Alias for ergonomics — PG table is managed_organization to avoid collision with better-auth's organization.
export const organizationTable = managedOrganization;
