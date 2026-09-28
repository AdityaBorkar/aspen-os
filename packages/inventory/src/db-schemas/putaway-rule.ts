import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const inventoryPutawayRule = pgTable(
  "inventory_putaway_rule",
  {
    capacity: numeric({ mode: "number" }).notNull(),
    capacity_uom: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_disabled: boolean().notNull().default(false),
    item_id: text().notNull(),
    priority: integer().notNull().default(1),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    warehouse_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_inventory_putaway_rule_item_warehouse").on(table.item_id, table.warehouse_id),
    index("idx_inventory_putaway_rule_item").on(table.item_id),
    index("idx_inventory_putaway_rule_warehouse").on(table.warehouse_id),
  ],
);

export type InventoryPutawayRule = typeof inventoryPutawayRule.$inferSelect;
export type NewInventoryPutawayRule = typeof inventoryPutawayRule.$inferInsert;
