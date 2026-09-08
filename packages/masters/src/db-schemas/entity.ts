import { masterEntityKindEnum, masterEntityStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const masterEntity = pgTable(
  "master_entity",
  {
    code: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    email: text(),
    founded_date: date(),
    id: uuidv7().primaryKey(),
    industry: text(),
    locale: text(),
    metadata: jsonb(),
    name: text().notNull(),
    organization_id: text(),
    phone: text(),
    registration_number: text(),
    status: masterEntityStatusEnum().notNull().default("active"),
    tax_id: text(),
    timezone: text(),
    type: masterEntityKindEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    website: text(),
  },
  (table) => [
    index("idx_master_entity_type").on(table.type),
    index("idx_master_entity_status").on(table.status),
    index("idx_master_entity_organization").on(table.organization_id),
    uniqueIndex("idx_master_entity_code").on(table.code),
  ],
);

export type MasterEntity = typeof masterEntity.$inferSelect;
export type NewMasterEntity = typeof masterEntity.$inferInsert;
