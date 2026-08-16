import { masterEntityKindEnum, masterEntityStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const masterEntity = pgTable(
  "master_entity",
  {
    code: text("code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    email: text("email"),
    foundedDate: date("founded_date"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    industry: text("industry"),
    locale: text("locale"),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    organizationId: text("organization_id"),
    phone: text("phone"),
    registrationNumber: text("registration_number"),
    status: masterEntityStatusEnum("status").notNull().default("active"),
    taxId: text("tax_id"),
    timezone: text("timezone"),
    type: masterEntityKindEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    website: text("website"),
  },
  (table) => [
    index("idx_master_entity_type").on(table.type),
    index("idx_master_entity_status").on(table.status),
    index("idx_master_entity_organization").on(table.organizationId),
    uniqueIndex("idx_master_entity_code").on(table.code),
  ],
);

export type MasterEntity = typeof masterEntity.$inferSelect;
export type NewMasterEntity = typeof masterEntity.$inferInsert;
