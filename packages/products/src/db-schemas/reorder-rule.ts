import { productsMaterialRequestTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Single owner: products owns reorder policy. Inventory owns the scan
// (reorder-scanner reads via ReorderRuleProvider) and breaches; accounting
// owns material-request creation off inventory.reorder_triggered.
export const productsReorderRule = pgTable(
  "products_reorder_rule",
  {
    check_in_group_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_disabled: boolean().notNull().default(false),
    item_id: text().notNull(),
    material_request_type: productsMaterialRequestTypeEnum().notNull().default("purchase"),
    reorder_level: numeric({ mode: "number" }).notNull(),
    reorder_qty: numeric({ mode: "number" }).notNull(),
    request_for_warehouse_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_products_reorder_rule_item").on(table.item_id),
    index("idx_products_reorder_rule_check").on(table.check_in_group_id),
    index("idx_products_reorder_rule_request").on(table.request_for_warehouse_id),
    index("idx_products_reorder_rule_disabled").on(table.is_disabled),
  ],
);

export type ProductsReorderRule = typeof productsReorderRule.$inferSelect;
export type NewProductsReorderRule = typeof productsReorderRule.$inferInsert;
