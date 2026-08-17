import { masterEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterBankAccount = pgTable(
  "master_bank_account",
  {
    accountHolderName: text("account_holder_name").notNull(),
    accountNumber: text("account_number").notNull(),
    accountType: text("account_type"),
    bankName: text("bank_name").notNull(),
    branchName: text("branch_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    currency: text("currency").notNull().default("USD"),
    entityId: text("entity_id").notNull(),
    entityType: masterEntityTypeEnum("entity_type").notNull(),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    isPrimary: boolean("is_primary").notNull().default(false),
    metadata: jsonb("metadata"),
    routingNumber: text("routing_number"),
    swiftCode: text("swift_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_master_bank_account_entity").on(table.entityType, table.entityId),
    index("idx_master_bank_account_is_active").on(table.isActive),
    index("idx_master_bank_account_is_primary").on(table.isPrimary),
  ],
);

export type MasterBankAccount = typeof masterBankAccount.$inferSelect;
export type NewMasterBankAccount = typeof masterBankAccount.$inferInsert;
