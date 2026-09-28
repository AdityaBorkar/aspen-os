import { inventorySerialStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const inventorySerial = pgTable(
  "inventory_serial",
  {
    amc_expiry_date: date(),
    batch_no: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    customer_id: text(),
    delivery_id: text(),
    expiry_date: date(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    purchase_id: text(),
    serial_no: text().notNull().unique(),
    status: inventorySerialStatusEnum().notNull().default("available"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    valuation_rate: numeric({ mode: "number" }),
    warehouse_id: text(),
    warranty_expiry_date: date(),
  },
  (table) => [
    uniqueIndex("idx_inventory_serial_no").on(table.serial_no),
    index("idx_inventory_serial_item").on(table.item_id),
    index("idx_inventory_serial_warehouse").on(table.warehouse_id),
    index("idx_inventory_serial_status").on(table.status),
    index("idx_inventory_serial_batch").on(table.batch_no),
  ],
);

export type InventorySerial = typeof inventorySerial.$inferSelect;
export type NewInventorySerial = typeof inventorySerial.$inferInsert;
