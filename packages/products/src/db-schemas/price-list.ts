import { productsPriceListApplicabilityEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Single owner: products owns price lists and item prices. Inventory stores
// valuation_rate snapshots (cost + landed-cost allocation); accounting stores
// agreed transaction rates. Resolve list prices via priceFetch.getRate.
export const productsPriceList = pgTable(
  "products_price_list",
  {
    applicability: productsPriceListApplicabilityEnum().notNull().default("both"),
    country: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    currency: text(),
    default_customer_id: text(),
    default_supplier_id: text(),
    id: uuidv7().primaryKey(),
    is_enabled: boolean().notNull().default(true),
    name: text().notNull(),
    price_not_uom_dependent: boolean().notNull().default(false),
    territory: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_products_price_list_name").on(table.name),
    index("idx_products_price_list_applicability").on(table.applicability),
    index("idx_products_price_list_enabled").on(table.is_enabled),
  ],
);

export type ProductsPriceList = typeof productsPriceList.$inferSelect;
export type NewProductsPriceList = typeof productsPriceList.$inferInsert;
