import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Single owner: inventory owns all stock movements via the append-only
// ledger. Accounting delivery/receipt/invoice docs are fulfilment records —
// they must delegate to inventory.stockEntries (or rich events), never write
// ledger rows directly.
export const inventoryStockLedger = pgTable(
  "inventory_stock_ledger",
  {
    batch_no: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    posting_date: date().notNull(),
    posting_time: text(),
    qty_delta: numeric({ mode: "number" }).notNull(),
    serial_no: text(),
    stock_entry_id: text(),
    valuation_rate: numeric({ mode: "number" }).notNull(),
    voucher_id: text().notNull(),
    voucher_item_id: text(),
    voucher_type: text().notNull(),
    warehouse_id: text().notNull(),
  },
  (table) => [
    index("idx_inventory_stock_ledger_item").on(table.item_id),
    index("idx_inventory_stock_ledger_warehouse").on(table.warehouse_id),
    index("idx_inventory_stock_ledger_posting_date").on(table.posting_date),
    index("idx_inventory_stock_ledger_voucher").on(table.voucher_type, table.voucher_id),
    index("idx_inventory_stock_ledger_batch").on(table.batch_no),
    index("idx_inventory_stock_ledger_serial").on(table.serial_no),
  ],
);

export type InventoryStockLedger = typeof inventoryStockLedger.$inferSelect;
export type NewInventoryStockLedger = typeof inventoryStockLedger.$inferInsert;
