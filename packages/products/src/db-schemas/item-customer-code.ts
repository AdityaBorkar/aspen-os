import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const productsItemCustomerCode = pgTable(
  "products_item_customer_code",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    customer_id: text().notNull(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    ref_code: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_products_item_customer_code_unique").on(
      table.item_id,
      table.customer_id,
      table.ref_code,
    ),
    index("idx_products_item_customer_code_item").on(table.item_id),
    index("idx_products_item_customer_code_customer").on(table.customer_id),
  ],
);

export type ProductsItemCustomerCode = typeof productsItemCustomerCode.$inferSelect;
export type NewProductsItemCustomerCode = typeof productsItemCustomerCode.$inferInsert;
