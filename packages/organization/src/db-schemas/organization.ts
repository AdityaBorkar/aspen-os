import { ORGANIZATION_STATUS } from "@aspen-os/constants";
import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const organizationStatusEnum = pgEnum("organization_status", [
  ORGANIZATION_STATUS.ACTIVE,
  ORGANIZATION_STATUS.ARCHIVED,
  ORGANIZATION_STATUS.SUSPENDED,
]);

export const organization = pgTable(
  "organization",
  {
    accent_color: text().notNull().default("#3B82F6"),
    address: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    email: text(),
    founded_date: date(),
    id: uuidv7().primaryKey(),
    industry: text(),
    locale: text().notNull().default("en-US"),
    logo: text(),
    metadata: jsonb(),
    name: text().notNull(),
    phone: text(),
    registration_number: text(),
    slug: text().notNull().unique(),
    status: organizationStatusEnum().notNull().default("active"),
    tax_id: text(),
    timezone: text().notNull().default("UTC"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    website: text(),
  },
  (table) => [index("idx_organization_slug").on(table.slug)],
);
