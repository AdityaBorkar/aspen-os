import { inventoryDocStatusEnum, inventoryPickListPurposeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inventoryPickList = pgTable(
  "inventory_pick_list",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_consumed: boolean().notNull().default(false),
    parent_warehouse_id: text(),
    prompt_qty: boolean().notNull().default(false),
    purpose: inventoryPickListPurposeEnum().notNull(),
    scan_mode: boolean().notNull().default(false),
    status: inventoryDocStatusEnum().notNull().default("draft"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_inventory_pick_list_purpose").on(table.purpose),
    index("idx_inventory_pick_list_status").on(table.status),
    index("idx_inventory_pick_list_parent").on(table.parent_warehouse_id),
  ],
);

export type InventoryPickList = typeof inventoryPickList.$inferSelect;
export type NewInventoryPickList = typeof inventoryPickList.$inferInsert;
