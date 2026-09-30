import { inventoryValuationMethodEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Single owner: inventory owns stock-policy keys (allow_negative_stock,
// default_valuation_method, sample_retention_warehouse_id,
// batch_naming_series, freeze window, reservations). Master/UI defaults
// (auto_insert_price_if_missing, clean_description_html,
// default_warehouse_id, show_barcode_field, limit_percent,
// over_deliver_receive_role, stock_uom_default) live in products_setting —
// products owns the item master.
export const inventorySetting = pgTable(
  "inventory_setting",
  {
    allow_edit_stock_uom_qty: boolean().notNull().default(false),
    allow_negative_stock: boolean().notNull().default(false),
    auto_reserve_on_purchase: boolean().notNull().default(false),
    batch_naming_series: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    default_valuation_method: inventoryValuationMethodEnum().notNull().default("moving_average"),
    enable_serial_batch: boolean().notNull().default(true),
    enable_stock_reservation: boolean().notNull().default(true),
    freeze_allowed_role: text(),
    freeze_older_than_days: integer(),
    freeze_upto_date: date(),
    id: uuidv7().primaryKey(),
    sample_retention_warehouse_id: text(),
    singleton: boolean().notNull().default(true),
    uom_restrict_to_item_conversions: boolean().notNull().default(false),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_inventory_setting_singleton").on(table.singleton)],
);

export type InventorySetting = typeof inventorySetting.$inferSelect;
export type NewInventorySetting = typeof inventorySetting.$inferInsert;
