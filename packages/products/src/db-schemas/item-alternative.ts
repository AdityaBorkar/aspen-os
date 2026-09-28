import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const productsItemAlternative = pgTable(
  "products_item_alternative",
  {
    alternative_item_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_two_way: boolean().notNull().default(false),
    item_id: text().notNull(),
  },
  (table) => [
    index("idx_products_item_alternative_item").on(table.item_id),
    index("idx_products_item_alternative_alt").on(table.alternative_item_id),
  ],
);

export type ProductsItemAlternative = typeof productsItemAlternative.$inferSelect;
export type NewProductsItemAlternative = typeof productsItemAlternative.$inferInsert;
