import { inventoryDocStatusEnum, inventoryReconciliationPurposeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inventoryReconciliation = pgTable(
  "inventory_reconciliation",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    difference_account: text().notNull().default("Stock Adjustment"),
    id: uuidv7().primaryKey(),
    posting_date: date().notNull(),
    posting_time: text(),
    purpose: inventoryReconciliationPurposeEnum().notNull(),
    status: inventoryDocStatusEnum().notNull().default("draft"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_inventory_reconciliation_purpose").on(table.purpose),
    index("idx_inventory_reconciliation_status").on(table.status),
    index("idx_inventory_reconciliation_posting_date").on(table.posting_date),
  ],
);

export type InventoryReconciliation = typeof inventoryReconciliation.$inferSelect;
export type NewInventoryReconciliation = typeof inventoryReconciliation.$inferInsert;
