import { inventoryReconcileModeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inventoryReconciliationItem = pgTable(
  "inventory_reconciliation_item",
  {
    batch_no: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    qty: numeric({ mode: "number" }),
    reconcile_mode: inventoryReconcileModeEnum(),
    reconciliation_id: text().notNull(),
    serial_nos: text().array().notNull().default([]),
    valuation_rate: numeric({ mode: "number" }),
    warehouse_id: text().notNull(),
  },
  (table) => [
    index("idx_inventory_reconciliation_item_parent").on(table.reconciliation_id),
    index("idx_inventory_reconciliation_item_item").on(table.item_id),
    index("idx_inventory_reconciliation_item_warehouse").on(table.warehouse_id),
    index("idx_inventory_reconciliation_item_batch").on(table.batch_no),
  ],
);

export type InventoryReconciliationItem = typeof inventoryReconciliationItem.$inferSelect;
export type NewInventoryReconciliationItem = typeof inventoryReconciliationItem.$inferInsert;
