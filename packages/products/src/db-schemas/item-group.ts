import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const productsItemGroup = pgTable(
  "products_item_group",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    default_cost_center: text(),
    default_expense_account: text(),
    default_income_account: text(),
    default_item_tax_template: text(),
    default_price_list: text(),
    default_supplier_id: text(),
    default_warehouse_id: text(),
    id: uuidv7().primaryKey(),
    is_disabled: boolean().notNull().default(false),
    is_group: boolean().notNull().default(false),
    name: text().notNull(),
    naming_prefix: text(),
    naming_series: text(),
    parent_id: text(),
    show_in_website: boolean().notNull().default(false),
    tax_category: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    weightage: integer(),
  },
  (table) => [
    index("idx_products_item_group_name").on(table.name),
    index("idx_products_item_group_parent").on(table.parent_id),
    index("idx_products_item_group_disabled").on(table.is_disabled),
  ],
);

export type ProductsItemGroup = typeof productsItemGroup.$inferSelect;
export type NewProductsItemGroup = typeof productsItemGroup.$inferInsert;
