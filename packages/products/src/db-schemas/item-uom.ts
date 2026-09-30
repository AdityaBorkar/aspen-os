import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Single owner: products owns canonical UOM conversions. Inventory legs and
// accounting lines store uom + factor snapshots only — resolve via
// products.itemUoms / priceFetch.getRate, never a second master.
export const productsItemUom = pgTable(
  "products_item_uom",
  {
    conversion_factor: numeric({ mode: "number" }).notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    must_be_whole_number: boolean().notNull().default(false),
    uom: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_products_item_uom_item").on(table.item_id),
    index("idx_products_item_uom_uom").on(table.item_id, table.uom),
  ],
);

export type ProductsItemUom = typeof productsItemUom.$inferSelect;
export type NewProductsItemUom = typeof productsItemUom.$inferInsert;
