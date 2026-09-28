import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inventoryStockEntryItem = pgTable(
  "inventory_stock_entry_item",
  {
    allow_negative_stock: boolean(),
    basic_rate: numeric({ mode: "number" }),
    batch_no: text(),
    conversion_factor: numeric({ mode: "number" }).notNull().default(1),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    qty: numeric({ mode: "number" }).notNull(),
    requires_batch: boolean().notNull().default(false),
    requires_serial: boolean().notNull().default(false),
    sales_order_id: text(),
    sales_order_item_id: text(),
    sample_qty: numeric({ mode: "number" }).notNull().default(0),
    serial_nos: text().array().notNull().default([]),
    source_warehouse_id: text(),
    stock_entry_id: text().notNull(),
    target_warehouse_id: text(),
    uom: text().notNull(),
    valuation_method: text(),
    valuation_rate: numeric({ mode: "number" }),
  },
  (table) => [
    index("idx_inventory_stock_entry_item_entry").on(table.stock_entry_id),
    index("idx_inventory_stock_entry_item_item").on(table.item_id),
    index("idx_inventory_stock_entry_item_batch").on(table.batch_no),
    index("idx_inventory_stock_entry_item_source").on(table.source_warehouse_id),
    index("idx_inventory_stock_entry_item_target").on(table.target_warehouse_id),
  ],
);

export type InventoryStockEntryItem = typeof inventoryStockEntryItem.$inferSelect;
export type NewInventoryStockEntryItem = typeof inventoryStockEntryItem.$inferInsert;
