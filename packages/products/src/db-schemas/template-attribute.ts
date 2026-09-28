import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const productsTemplateAttribute = pgTable(
  "products_template_attribute",
  {
    attribute_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_required: boolean().notNull().default(true),
    template_item_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_products_template_attribute_unique").on(
      table.template_item_id,
      table.attribute_id,
    ),
    index("idx_products_template_attribute_template").on(table.template_item_id),
    index("idx_products_template_attribute_attribute").on(table.attribute_id),
  ],
);

export type ProductsTemplateAttribute = typeof productsTemplateAttribute.$inferSelect;
export type NewProductsTemplateAttribute = typeof productsTemplateAttribute.$inferInsert;
