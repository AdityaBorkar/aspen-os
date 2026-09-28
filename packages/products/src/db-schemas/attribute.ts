import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const productsAttribute = pgTable(
  "products_attribute",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_disabled: boolean().notNull().default(false),
    is_numeric: boolean().notNull().default(false),
    name: text().notNull(),
    unit: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_products_attribute_name").on(table.name),
    index("idx_products_attribute_disabled").on(table.is_disabled),
  ],
);

export type ProductsAttribute = typeof productsAttribute.$inferSelect;
export type NewProductsAttribute = typeof productsAttribute.$inferInsert;
