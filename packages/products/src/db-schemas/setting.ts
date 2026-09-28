import { productsNamingModeEnum, productsValuationMethodEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const productsSetting = pgTable("products_setting", {
  allow_negative_stock: boolean().notNull().default(false),
  auto_insert_price_if_missing: boolean().notNull().default(false),
  batch_naming_series: text(),
  clean_description_html: boolean().notNull().default(true),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  default_item_group_id: text(),
  default_stock_uom: text().notNull().default("Nos"),
  default_valuation_method: productsValuationMethodEnum().notNull().default("moving_average"),
  default_warehouse_id: text(),
  id: uuidv7().primaryKey(),
  item_naming_by: productsNamingModeEnum().notNull().default("item_code"),
  limit_percent: numeric({ mode: "number" }).notNull().default(0),
  over_deliver_receive_role: text(),
  sample_retention_warehouse_id: text(),
  serial_batch_enabled: boolean().notNull().default(true),
  show_barcode_field: boolean().notNull().default(true),
  updated_at: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ProductsSetting = typeof productsSetting.$inferSelect;
export type NewProductsSetting = typeof productsSetting.$inferInsert;
