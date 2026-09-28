import { inventoryReservationStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inventoryReservationEntry = pgTable(
  "inventory_reservation_entry",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    delivered_qty: numeric({ mode: "number" }).notNull().default(0),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    pick_list_id: text(),
    reserved_qty: numeric({ mode: "number" }).notNull(),
    sales_order_id: text(),
    sales_order_item_id: text(),
    status: inventoryReservationStatusEnum().notNull().default("reserved"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    warehouse_id: text().notNull(),
  },
  (table) => [
    index("idx_inventory_reservation_entry_item").on(table.item_id),
    index("idx_inventory_reservation_entry_warehouse").on(table.warehouse_id),
    index("idx_inventory_reservation_entry_sales_order").on(table.sales_order_id),
    index("idx_inventory_reservation_entry_pick_list").on(table.pick_list_id),
    index("idx_inventory_reservation_entry_status").on(table.status),
  ],
);

export type InventoryReservationEntry = typeof inventoryReservationEntry.$inferSelect;
export type NewInventoryReservationEntry = typeof inventoryReservationEntry.$inferInsert;
