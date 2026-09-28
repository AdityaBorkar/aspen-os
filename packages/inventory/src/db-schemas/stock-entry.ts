import { inventoryDocStatusEnum, inventoryStockEntryPurposeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inventoryStockEntry = pgTable(
  "inventory_stock_entry",
  {
    add_to_transit: boolean().notNull().default(false),
    allow_zero_valuation: boolean().notNull().default(false),
    amend_from: text(),
    apply_putaway_rule: boolean().notNull().default(false),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    inspection_required: boolean().notNull().default(false),
    is_opening: boolean().notNull().default(false),
    party_id: text(),
    posting_date: date().notNull(),
    posting_time: text(),
    purpose: inventoryStockEntryPurposeEnum().notNull(),
    source_warehouse_id: text(),
    status: inventoryDocStatusEnum().notNull().default("draft"),
    target_warehouse_id: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    work_order_id: text(),
  },
  (table) => [
    index("idx_inventory_stock_entry_purpose").on(table.purpose),
    index("idx_inventory_stock_entry_status").on(table.status),
    index("idx_inventory_stock_entry_posting_date").on(table.posting_date),
    index("idx_inventory_stock_entry_source").on(table.source_warehouse_id),
    index("idx_inventory_stock_entry_target").on(table.target_warehouse_id),
    index("idx_inventory_stock_entry_work_order").on(table.work_order_id),
  ],
);

export type InventoryStockEntry = typeof inventoryStockEntry.$inferSelect;
export type NewInventoryStockEntry = typeof inventoryStockEntry.$inferInsert;
