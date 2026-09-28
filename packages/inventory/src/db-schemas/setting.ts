import { inventoryValuationMethodEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const inventorySetting = pgTable(
  "inventory_setting",
  {
    allow_edit_stock_uom_qty: boolean().notNull().default(false),
    allow_negative_stock: boolean().notNull().default(false),
    auto_insert_price_if_missing: boolean().notNull().default(false),
    auto_reserve_on_purchase: boolean().notNull().default(false),
    batch_naming_series: text(),
    clean_description_html: boolean().notNull().default(false),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    default_valuation_method: inventoryValuationMethodEnum().notNull().default("moving_average"),
    default_warehouse_id: text(),
    enable_serial_batch: boolean().notNull().default(true),
    enable_stock_reservation: boolean().notNull().default(true),
    freeze_allowed_role: text(),
    freeze_older_than_days: integer(),
    freeze_upto_date: date(),
    id: uuidv7().primaryKey(),
    limit_percent: numeric({ mode: "number" }),
    over_deliver_receive_role: text(),
    sample_retention_warehouse_id: text(),
    show_barcode_field: boolean().notNull().default(false),
    singleton: boolean().notNull().default(true),
    stock_uom_default: text(),
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
