import { masterUomCategoryEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
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
    is_default: boolean().notNull().default(false),
    is_indivisible: boolean().notNull().default(false),
    is_system: boolean().notNull().default(false),
    metadata: jsonb(),
    name: text().notNull(),
    status: text().notNull().default("draft"),
    symbol: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_master_uom_code").on(table.code),
    index("idx_master_uom_category").on(table.category),
    index("idx_master_uom_is_active").on(table.is_active),
    index("idx_master_uom_status").on(table.status),
    index("idx_master_uom_symbol").on(table.symbol),
  ],
);

export type MasterUnitOfMeasure = typeof masterUnitOfMeasure.$inferSelect;
export type NewMasterUnitOfMeasure = typeof masterUnitOfMeasure.$inferInsert;

export const masterUomAlias = pgTable(
  "master_uom_alias",
  {
    alias: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    uom_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_master_uom_alias_alias").on(table.alias),
    index("idx_master_uom_alias_uom_id").on(table.uom_id),
  ],
);

export type MasterUomAlias = typeof masterUomAlias.$inferSelect;
export type NewMasterUomAlias = typeof masterUomAlias.$inferInsert;

export const masterUomVersion = pgTable(
  "master_uom_version",
  {
    conversion_factor: numeric({ mode: "number" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    decimal_places: integer(),
    effective_from: date().notNull(),
    id: uuidv7().primaryKey(),
    reason: text(),
    superseded_at: timestamp({ withTimezone: true }),
    uom_id: text().notNull(),
  },
  (table) => [
    index("idx_master_uom_version_uom_id").on(table.uom_id),
    index("idx_master_uom_version_effective").on(table.uom_id, table.effective_from),
  ],
);

export type MasterUomVersion = typeof masterUomVersion.$inferSelect;
export type NewMasterUomVersion = typeof masterUomVersion.$inferInsert;
