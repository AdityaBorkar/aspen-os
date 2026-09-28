import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const productsAttributeValue = pgTable(
  "products_attribute_value",
  {
    attribute_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    range_high: numeric({ mode: "number" }),
    range_increment: numeric({ mode: "number" }),
    range_low: numeric({ mode: "number" }),
    sort_order: integer().notNull().default(0),
    value: text().notNull(),
  },
  (table) => [
    index("idx_products_attribute_value_attribute").on(table.attribute_id),
    index("idx_products_attribute_value_value").on(table.attribute_id, table.value),
  ],
);

export type ProductsAttributeValue = typeof productsAttributeValue.$inferSelect;
export type NewProductsAttributeValue = typeof productsAttributeValue.$inferInsert;
