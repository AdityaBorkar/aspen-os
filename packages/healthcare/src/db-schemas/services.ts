import type { JsonValue } from "@aspen-os/platform/server";
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

export const healthcareService = pgTable(
  "healthcare_service",
  {
    base_price: numeric(),
    branch_id: text().notNull().default("main"),
    code: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    facility_ids: text().array().notNull().default([]),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull().default("draft"),
    tele_exempt: boolean().notNull().default(false),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_healthcare_service_code").on(table.branch_id, table.code),
    index("idx_healthcare_service_branch_id").on(table.branch_id),
    index("idx_healthcare_service_status").on(table.status),
  ],
);

export type HealthcareService = typeof healthcareService.$inferSelect;
export type NewHealthcareService = typeof healthcareService.$inferInsert;

export const healthcareServicePrice = pgTable(
  "healthcare_service_price",
  {
    amount: numeric().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    effective_from: date().notNull(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    pricelist: text().notNull().default("standard"),
    service_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_service_price_branch_id").on(table.branch_id),
    index("idx_healthcare_service_price_service_id").on(table.service_id),
  ],
);

export type HealthcareServicePrice = typeof healthcareServicePrice.$inferSelect;
export type NewHealthcareServicePrice = typeof healthcareServicePrice.$inferInsert;

export const healthcareDiscountRule = pgTable(
  "healthcare_discount_rule",
  {
    branch_id: text().notNull().default("main"),
    code: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    min_qty: integer(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    pct: numeric().notNull(),
    service_id: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_discount_rule_branch_id").on(table.branch_id),
    index("idx_healthcare_discount_rule_service_id").on(table.service_id),
  ],
);

export type HealthcareDiscountRule = typeof healthcareDiscountRule.$inferSelect;
export type NewHealthcareDiscountRule = typeof healthcareDiscountRule.$inferInsert;

export const healthcarePackageDef = pgTable(
  "healthcare_package_def",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    price: numeric().notNull(),
    service_ids: text().array().notNull().default([]),
    status: text().notNull().default("published"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_package_def_branch_id").on(table.branch_id),
    index("idx_healthcare_package_def_status").on(table.status),
  ],
);

export type HealthcarePackageDef = typeof healthcarePackageDef.$inferSelect;
export type NewHealthcarePackageDef = typeof healthcarePackageDef.$inferInsert;
