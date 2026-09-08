import { masterEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterBankAccount = pgTable(
  "master_bank_account",
  {
    account_holder_name: text().notNull(),
    account_number: text().notNull(),
    account_type: text(),
    bank_name: text().notNull(),
    branch_name: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    currency: text().notNull().default("USD"),
    entity_id: text().notNull(),
    entity_type: masterEntityTypeEnum().notNull(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    is_primary: boolean().notNull().default(false),
    metadata: jsonb(),
    routing_number: text(),
    swift_code: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_master_bank_account_entity").on(table.entity_type, table.entity_id),
    index("idx_master_bank_account_is_active").on(table.is_active),
    index("idx_master_bank_account_is_primary").on(table.is_primary),
  ],
);

export type MasterBankAccount = typeof masterBankAccount.$inferSelect;
export type NewMasterBankAccount = typeof masterBankAccount.$inferInsert;
