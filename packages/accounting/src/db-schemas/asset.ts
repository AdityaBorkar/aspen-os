import {
  accountingAssetStatusEnum,
  accountingDepreciationFrequencyEnum,
  accountingDepreciationMethodEnum,
  accountingScheduleStatusEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export interface AssetTransferRecord {
  at: string;
  fromLocationId: string | null;
  note?: string;
  toLocationId: string;
}

export interface AssetRepairRecord {
  at: string;
  cost: string;
  note?: string;
}

export const accountingAssetCategory = pgTable(
  "accounting_asset_category",
  {
    accumulated_account: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    depreciation_account: text(),
    depreciation_method: accountingDepreciationMethodEnum().notNull(),
    frequency: accountingDepreciationFrequencyEnum().notNull().default("yearly"),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    residual_value: numeric().notNull().default("0"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    useful_life_years: integer().notNull().default(5),
  },
  (table) => [index("idx_accounting_asset_category_name").on(table.name)],
);

export const accountingAssetLocation = pgTable(
  "accounting_asset_location",
  {
    address: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
  },
  (table) => [index("idx_accounting_asset_location_name").on(table.name)],
);

export const accountingAsset = pgTable(
  "accounting_asset",
  {
    accumulated_depreciation: numeric().notNull().default("0"),
    asset_name: text().notNull(),
    available_for_use_date: date(),
    book_value: numeric().notNull().default("0"),
    category_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    custodian: text(),
    depreciation_method: accountingDepreciationMethodEnum(),
    frequency: accountingDepreciationFrequencyEnum(),
    gross_value: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    insurance: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    // Soft FK to products_item. Single owner: products owns the
    // is_fixed_asset/auto_create_assets_on_purchase flags; accounting owns
    // the asset register. Auto-create off receipt/invoice for flagged items.
    item_id: text(),
    location_id: text(),
    purchase_date: date(),
    quantity: numeric().notNull().default("1"),
    repair_log: jsonb().$type<AssetRepairRecord[]>().notNull().default([]),
    residual_value: numeric().notNull().default("0"),
    status: accountingAssetStatusEnum().notNull().default("draft"),
    supplier_invoice_id: text(),
    transfer_history: jsonb().$type<AssetTransferRecord[]>().notNull().default([]),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    useful_life_years: integer().notNull().default(5),
  },
  (table) => [
    index("idx_accounting_asset_category_id").on(table.category_id),
    index("idx_accounting_asset_location_id").on(table.location_id),
    index("idx_accounting_asset_status").on(table.status),
  ],
);

export const accountingDepreciationSchedule = pgTable(
  "accounting_depreciation_schedule",
  {
    amount: numeric().notNull().default("0"),
    asset_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expected_date: date().notNull(),
    id: uuidv7().primaryKey(),
    journal_id: text(),
    status: accountingScheduleStatusEnum().notNull().default("scheduled"),
  },
  (table) => [
    index("idx_accounting_depreciation_schedule_asset_id").on(table.asset_id),
    index("idx_accounting_depreciation_schedule_expected_date").on(table.expected_date),
    index("idx_accounting_depreciation_schedule_status").on(table.status),
  ],
);

export type AccountingAssetCategory = typeof accountingAssetCategory.$inferSelect;
export type NewAccountingAssetCategory = typeof accountingAssetCategory.$inferInsert;
export type AccountingAssetLocation = typeof accountingAssetLocation.$inferSelect;
export type NewAccountingAssetLocation = typeof accountingAssetLocation.$inferInsert;
export type AccountingAsset = typeof accountingAsset.$inferSelect;
export type NewAccountingAsset = typeof accountingAsset.$inferInsert;
export type AccountingDepreciationSchedule = typeof accountingDepreciationSchedule.$inferSelect;
export type NewAccountingDepreciationSchedule = typeof accountingDepreciationSchedule.$inferInsert;
