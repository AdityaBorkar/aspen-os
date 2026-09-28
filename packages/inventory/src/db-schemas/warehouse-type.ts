import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const inventoryWarehouseType = pgTable(
  "inventory_warehouse_type",
  {
    code: text().notNull().unique(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    id: uuidv7().primaryKey(),
    is_disabled: boolean().notNull().default(false),
    name: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_inventory_warehouse_type_code").on(table.code),
    index("idx_inventory_warehouse_type_disabled").on(table.is_disabled),
  ],
);

export type InventoryWarehouseType = typeof inventoryWarehouseType.$inferSelect;
export type NewInventoryWarehouseType = typeof inventoryWarehouseType.$inferInsert;
