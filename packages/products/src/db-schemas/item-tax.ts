import { uuidv7 } from "@aspen-os/platform/server";
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const productsItemTax = pgTable(
  "products_item_tax",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    tax_category: text(),
    tax_rate_override: numeric({ mode: "number" }),
    tax_template: text(),
  },
  (table) => [index("idx_products_item_tax_item").on(table.item_id)],
);

export type ProductsItemTax = typeof productsItemTax.$inferSelect;
export type NewProductsItemTax = typeof productsItemTax.$inferInsert;
