import { uuidv7 } from "@aspen-os/platform/server";
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inventoryAdditionalCost = pgTable(
  "inventory_additional_cost",
  {
    amount: numeric({ mode: "number" }).notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    expense_account: text().notNull(),
    id: uuidv7().primaryKey(),
    stock_entry_id: text().notNull(),
  },
  (table) => [index("idx_inventory_additional_cost_entry").on(table.stock_entry_id)],
);

export type InventoryAdditionalCost = typeof inventoryAdditionalCost.$inferSelect;
export type NewInventoryAdditionalCost = typeof inventoryAdditionalCost.$inferInsert;
