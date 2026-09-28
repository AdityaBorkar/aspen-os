import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const productsManufacturerPart = pgTable(
  "products_manufacturer_part",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    manufacturer_id: text().notNull(),
    manufacturer_part_no: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_products_manufacturer_part_unique").on(
      table.item_id,
      table.manufacturer_id,
      table.manufacturer_part_no,
    ),
    index("idx_products_manufacturer_part_item").on(table.item_id),
    index("idx_products_manufacturer_part_manufacturer").on(table.manufacturer_id),
  ],
);

export type ProductsManufacturerPart = typeof productsManufacturerPart.$inferSelect;
export type NewProductsManufacturerPart = typeof productsManufacturerPart.$inferInsert;
