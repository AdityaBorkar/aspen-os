import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const productsPricelistSetting = pgTable("products_pricelist_setting", {
  allow_batch_specific: boolean().notNull().default(true),
  allow_party_specific: boolean().notNull().default(true),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  default_buying_list_id: text(),
  default_selling_list_id: text(),
  id: uuidv7().primaryKey(),
  require_validity: boolean().notNull().default(false),
  updated_at: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ProductsPricelistSetting = typeof productsPricelistSetting.$inferSelect;
export type NewProductsPricelistSetting = typeof productsPricelistSetting.$inferInsert;
