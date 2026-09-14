import { healthcareResidentStatusEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import {
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

export interface HealthcarePolypharmacyMed {
  dose: string;
  frequency: string;
  name: string;
}

export const healthcareResident = pgTable(
  "healthcare_resident",
  {
    address: text(),
    advance: numeric().notNull().default("0"),
    age: integer(),
    bed_id: text(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    nok_name: text(),
    nok_phone: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    phone: text(),
    room_type: text(),
    sex: text(),
    status: healthcareResidentStatusEnum().notNull().default("admitted"),
    uhid: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_healthcare_resident_uhid").on(table.uhid),
    index("idx_healthcare_resident_branch_id").on(table.branch_id),
    index("idx_healthcare_resident_status").on(table.status),
  ],
);

export const healthcareBedAssignment = pgTable(
  "healthcare_bed_assignment",
  {
    bed_id: text().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    note: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    released_at: timestamp({ withTimezone: true }),
    resident_id: text().notNull(),
    status: text().notNull().default("occupied"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_bed_assignment_bed_id").on(table.bed_id),
    index("idx_healthcare_bed_assignment_branch_id").on(table.branch_id),
    index("idx_healthcare_bed_assignment_resident_id").on(table.resident_id),
  ],
);

export const healthcareGeriatricScore = pgTable(
  "healthcare_geriatric_score",
  {
    assessed_by: text(),
    band: text(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    kind: text().notNull(),
    note: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    resident_id: text().notNull(),
    score: numeric().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_geriatric_score_branch_id").on(table.branch_id),
    index("idx_healthcare_geriatric_score_resident_id").on(table.resident_id),
  ],
);

export const healthcarePolypharmacyReview = pgTable(
  "healthcare_polypharmacy_review",
  {
    action: text().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    meds: jsonb().$type<HealthcarePolypharmacyMed[]>().notNull().default([]),
    note: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    resident_id: text().notNull(),
    reviewed_by: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_polypharmacy_review_branch_id").on(table.branch_id),
    index("idx_healthcare_polypharmacy_review_resident_id").on(table.resident_id),
  ],
);

export const healthcareDailyLog = pgTable(
  "healthcare_daily_log",
  {
    appetite: text(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    mood: text(),
    note: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    resident_id: text().notNull(),
    status: text().notNull().default("complete"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_daily_log_branch_id").on(table.branch_id),
    index("idx_healthcare_daily_log_resident_id").on(table.resident_id),
  ],
);

export const healthcareRound = pgTable(
  "healthcare_round",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    done_by: text(),
    findings: text().notNull(),
    id: uuidv7().primaryKey(),
    orders_note: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    plan: text(),
    resident_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_round_branch_id").on(table.branch_id),
    index("idx_healthcare_round_resident_id").on(table.resident_id),
  ],
);

export const healthcareVisitLog = pgTable(
  "healthcare_visit_log",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    purpose: text().notNull(),
    relation: text(),
    resident_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    visitor: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_visit_log_branch_id").on(table.branch_id),
    index("idx_healthcare_visit_log_resident_id").on(table.resident_id),
  ],
);

export const healthcareStayCharge = pgTable(
  "healthcare_stay_charge",
  {
    amount: numeric().notNull(),
    branch_id: text().notNull().default("main"),
    charge_date: date().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    kind: text().notNull().default("stay"),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    resident_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_stay_charge_branch_id").on(table.branch_id),
    index("idx_healthcare_stay_charge_resident_id").on(table.resident_id),
  ],
);

export type HealthcareResident = typeof healthcareResident.$inferSelect;
export type NewHealthcareResident = typeof healthcareResident.$inferInsert;
export type HealthcareBedAssignment = typeof healthcareBedAssignment.$inferSelect;
export type NewHealthcareBedAssignment = typeof healthcareBedAssignment.$inferInsert;
export type HealthcareGeriatricScore = typeof healthcareGeriatricScore.$inferSelect;
export type NewHealthcareGeriatricScore = typeof healthcareGeriatricScore.$inferInsert;
export type HealthcarePolypharmacyReview = typeof healthcarePolypharmacyReview.$inferSelect;
export type NewHealthcarePolypharmacyReview = typeof healthcarePolypharmacyReview.$inferInsert;
export type HealthcareDailyLog = typeof healthcareDailyLog.$inferSelect;
export type NewHealthcareDailyLog = typeof healthcareDailyLog.$inferInsert;
export type HealthcareRound = typeof healthcareRound.$inferSelect;
export type NewHealthcareRound = typeof healthcareRound.$inferInsert;
export type HealthcareVisitLog = typeof healthcareVisitLog.$inferSelect;
export type NewHealthcareVisitLog = typeof healthcareVisitLog.$inferInsert;
export type HealthcareStayCharge = typeof healthcareStayCharge.$inferSelect;
export type NewHealthcareStayCharge = typeof healthcareStayCharge.$inferInsert;
