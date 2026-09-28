import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const productsManufacturer = pgTable(
  "products_manufacturer",
  {
    country: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    id: uuidv7().primaryKey(),
    is_disabled: boolean().notNull().default(false),
    name: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    website: text(),
  },
  (table) => [
    uniqueIndex("idx_products_manufacturer_name").on(table.name),
    index("idx_products_manufacturer_disabled").on(table.is_disabled),
  ],
);

export type ProductsManufacturer = typeof productsManufacturer.$inferSelect;
export type NewProductsManufacturer = typeof productsManufacturer.$inferInsert;
