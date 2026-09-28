import { inventoryBatchStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const inventoryBatch = pgTable(
  "inventory_batch",
  {
    batch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiry_date: date(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    manufacturing_date: date(),
    status: inventoryBatchStatusEnum().notNull().default("active"),
    supplier_id: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_inventory_batch_item_batch").on(table.item_id, table.batch_id),
    index("idx_inventory_batch_item").on(table.item_id),
    index("idx_inventory_batch_status").on(table.status),
    index("idx_inventory_batch_expiry").on(table.expiry_date),
  ],
);

export type InventoryBatch = typeof inventoryBatch.$inferSelect;
export type NewInventoryBatch = typeof inventoryBatch.$inferInsert;
