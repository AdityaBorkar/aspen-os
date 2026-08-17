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
    baseUnitId: text("base_unit_id"),
    category: masterUomCategoryEnum("category").notNull(),
    code: text("code").notNull(),
    conversionFactor: numeric("conversion_factor", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decimalPlaces: integer("decimal_places").notNull().default(2),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    isBaseUnit: boolean("is_base_unit").notNull().default(false),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    symbol: text("symbol"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_master_uom_code").on(table.code),
    index("idx_master_uom_category").on(table.category),
    index("idx_master_uom_is_active").on(table.isActive),
  ],
);

export type MasterUnitOfMeasure = typeof masterUnitOfMeasure.$inferSelect;
export type NewMasterUnitOfMeasure = typeof masterUnitOfMeasure.$inferInsert;
