import { ORGANIZATION_STATUS } from "@aspen-os/constants";
import {
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const organizationStatusEnum = pgEnum("organization_status", [
  ORGANIZATION_STATUS.ACTIVE,
  ORGANIZATION_STATUS.ARCHIVED,
  ORGANIZATION_STATUS.SUSPENDED,
]);

export const organization = pgTable(
  "organization",
  {
    accentColor: text("accent_color").notNull().default("#3B82F6"),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text("email"),
    foundedDate: date("founded_date"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    industry: text("industry"),
    locale: text("locale").notNull().default("en-US"),
    logo: text("logo"),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    phone: text("phone"),
    registrationNumber: text("registration_number"),
    slug: text("slug").notNull().unique(),
    status: organizationStatusEnum("status").notNull().default("active"),
    taxId: text("tax_id"),
    timezone: text("timezone").notNull().default("UTC"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    website: text("website"),
  },
  (table) => [index("idx_organization_slug").on(table.slug)],
);
