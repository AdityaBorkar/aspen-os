import { productsItemPriceStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const productsItemPrice = pgTable(
  "products_item_price",
  {
    batch_no: text(),
    conversion_factor: numeric({ mode: "number" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    customer_id: text(),
    fetch_count: integer().notNull().default(0),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    last_fetched_at: timestamp({ withTimezone: true }),
    lead_time_days: integer(),
    min_qty: numeric({ mode: "number" }),
    note: text(),
    packing_unit: numeric({ mode: "number" }),
    price_list_id: text().notNull(),
    rate: numeric({ mode: "number" }).notNull(),
    status: productsItemPriceStatusEnum().notNull().default("active"),
    supplier_id: text(),
    uom: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    valid_from: date().notNull(),
    valid_upto: date(),
  },
  (table) => [
    index("idx_products_item_price_item").on(table.item_id),
    index("idx_products_item_price_list").on(table.price_list_id),
    index("idx_products_item_price_list_item").on(table.price_list_id, table.item_id),
    index("idx_products_item_price_customer").on(table.customer_id),
    index("idx_products_item_price_supplier").on(table.supplier_id),
    index("idx_products_item_price_batch").on(table.batch_no),
    index("idx_products_item_price_status").on(table.status),
  ],
);

export type ProductsItemPrice = typeof productsItemPrice.$inferSelect;
export type NewProductsItemPrice = typeof productsItemPrice.$inferInsert;
