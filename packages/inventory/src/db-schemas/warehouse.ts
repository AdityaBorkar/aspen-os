import { inventoryWarehouseTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Single owner: inventory owns the warehouse master. Products
// (item/group/setting/reorder) and accounting (all fulfilment docs) hold
// soft text FKs only — validate via inventory.warehouses at create time.
export const inventoryWarehouse = pgTable(
  "inventory_warehouse",
  {
    account_head: text(),
    address_id: text(),
    contact_id: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_disabled: boolean().notNull().default(false),
    is_group: boolean().notNull().default(false),
    name: text().notNull(),
    parent_id: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    warehouse_type: inventoryWarehouseTypeEnum().notNull().default("stock"),
  },
  (table) => [
    index("idx_inventory_warehouse_parent").on(table.parent_id),
    index("idx_inventory_warehouse_type").on(table.warehouse_type),
    index("idx_inventory_warehouse_disabled").on(table.is_disabled),
    index("idx_inventory_warehouse_group").on(table.is_group),
    index("idx_inventory_warehouse_name").on(table.name),
  ],
);

export type InventoryWarehouse = typeof inventoryWarehouse.$inferSelect;
export type NewInventoryWarehouse = typeof inventoryWarehouse.$inferInsert;
