import { masterUomCategoryEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const masterUnitOfMeasure = pgTable(
  "master_unit_of_measure",
  {
    base_unit_id: text(),
    category: masterUomCategoryEnum().notNull(),
    code: text().notNull(),
    conversion_factor: numeric({ mode: "number" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    decimal_places: integer().notNull().default(2),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    is_base_unit: boolean().notNull().default(false),
    metadata: jsonb(),
    name: text().notNull(),
    symbol: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_master_uom_code").on(table.code),
    index("idx_master_uom_category").on(table.category),
    index("idx_master_uom_is_active").on(table.is_active),
  ],
);

export type MasterUnitOfMeasure = typeof masterUnitOfMeasure.$inferSelect;
export type NewMasterUnitOfMeasure = typeof masterUnitOfMeasure.$inferInsert;
