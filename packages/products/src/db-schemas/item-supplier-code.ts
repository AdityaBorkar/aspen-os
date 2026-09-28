import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const productsItemSupplierCode = pgTable(
  "products_item_supplier_code",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    supplier_id: text().notNull(),
    supplier_part_no: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_products_item_supplier_code_unique").on(
      table.item_id,
      table.supplier_id,
      table.supplier_part_no,
    ),
    index("idx_products_item_supplier_code_item").on(table.item_id),
    index("idx_products_item_supplier_code_supplier").on(table.supplier_id),
  ],
);

export type ProductsItemSupplierCode = typeof productsItemSupplierCode.$inferSelect;
export type NewProductsItemSupplierCode = typeof productsItemSupplierCode.$inferInsert;
