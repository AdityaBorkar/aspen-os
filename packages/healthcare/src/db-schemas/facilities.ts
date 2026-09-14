import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareFacility = pgTable(
  "healthcare_facility",
  {
    branch_id: text().notNull().default("main"),
    category: text().notNull(),
    code: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    occupied_at: timestamp({ withTimezone: true }),
    occupied_note: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull().default("free"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_facility_branch_id").on(table.branch_id),
    index("idx_healthcare_facility_category").on(table.category),
    index("idx_healthcare_facility_status").on(table.status),
  ],
);

export type HealthcareFacility = typeof healthcareFacility.$inferSelect;
export type NewHealthcareFacility = typeof healthcareFacility.$inferInsert;

export const healthcareFacilityBlock = pgTable(
  "healthcare_facility_block",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    facility_id: text().notNull(),
    from_at: timestamp({ withTimezone: true }).notNull(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    reason: text(),
    to_at: timestamp({ withTimezone: true }).notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_facility_block_branch_id").on(table.branch_id),
    index("idx_healthcare_facility_block_facility_id").on(table.facility_id),
  ],
);

export type HealthcareFacilityBlock = typeof healthcareFacilityBlock.$inferSelect;
export type NewHealthcareFacilityBlock = typeof healthcareFacilityBlock.$inferInsert;

export const healthcareSterilizationLog = pgTable(
  "healthcare_sterilization_log",
  {
    at: timestamp({ withTimezone: true }).notNull(),
    branch_id: text().notNull().default("main"),
    by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    facility_id: text().notNull(),
    id: uuidv7().primaryKey(),
    item: text().notNull(),
    method: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_sterilization_log_branch_id").on(table.branch_id),
    index("idx_healthcare_sterilization_log_facility_id").on(table.facility_id),
  ],
);

export type HealthcareSterilizationLog = typeof healthcareSterilizationLog.$inferSelect;
export type NewHealthcareSterilizationLog = typeof healthcareSterilizationLog.$inferInsert;
