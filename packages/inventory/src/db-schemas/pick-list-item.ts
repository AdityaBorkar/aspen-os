import { uuidv7 } from "@aspen-os/platform/server";
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inventoryPickListItem = pgTable(
  "inventory_pick_list_item",
  {
    batch_no: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    material_request_id: text(),
    pick_list_id: text().notNull(),
    picked_qty: numeric({ mode: "number" }).notNull().default(0),
    qty: numeric({ mode: "number" }).notNull(),
    sales_order_id: text(),
    sales_order_item_id: text(),
    serial_nos: text().array().notNull().default([]),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_inventory_pick_list_item_parent").on(table.pick_list_id),
    index("idx_inventory_pick_list_item_item").on(table.item_id),
    index("idx_inventory_pick_list_item_warehouse").on(table.warehouse_id),
    index("idx_inventory_pick_list_item_sales_order").on(table.sales_order_id),
  ],
);

export type InventoryPickListItem = typeof inventoryPickListItem.$inferSelect;
export type NewInventoryPickListItem = typeof inventoryPickListItem.$inferInsert;
