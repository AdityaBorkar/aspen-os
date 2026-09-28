import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const productsBrand = pgTable(
  "products_brand",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    id: uuidv7().primaryKey(),
    image_file_id: text(),
    is_disabled: boolean().notNull().default(false),
    name: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_products_brand_name").on(table.name),
    index("idx_products_brand_disabled").on(table.is_disabled),
  ],
);

export type ProductsBrand = typeof productsBrand.$inferSelect;
export type NewProductsBrand = typeof productsBrand.$inferInsert;
