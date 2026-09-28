import { productsBarcodeTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const productsBarcode = pgTable(
  "products_barcode",
  {
    barcode: text().notNull(),
    barcode_type: productsBarcodeTypeEnum().notNull().default("other"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    uom: text(),
  },
  (table) => [
    uniqueIndex("idx_products_barcode_barcode").on(table.barcode),
    index("idx_products_barcode_item").on(table.item_id),
  ],
);

export type ProductsBarcode = typeof productsBarcode.$inferSelect;
export type NewProductsBarcode = typeof productsBarcode.$inferInsert;
