import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareAyushCaseSheet = pgTable(
  "healthcare_ayush_case_sheet",
  {
    branch_id: text().notNull(),
    complaints: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    dosha: text().notNull(),
    encounter_id: text().notNull(),
    history: text(),
    id: uuidv7().primaryKey(),
    nadi: text().notNull(),
    pathy: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    prakriti: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_ayush_case_sheet_branch_id").on(table.branch_id),
    index("idx_healthcare_ayush_case_sheet_encounter_id").on(table.encounter_id),
    index("idx_healthcare_ayush_case_sheet_patient_id").on(table.patient_id),
    index("idx_healthcare_ayush_case_sheet_pathy").on(table.pathy),
  ],
);

export type HealthcareAyushCaseSheet = typeof healthcareAyushCaseSheet.$inferSelect;
export type NewHealthcareAyushCaseSheet = typeof healthcareAyushCaseSheet.$inferInsert;

export const healthcareRepertorization = pgTable(
  "healthcare_repertorization",
  {
    branch_id: text().notNull(),
    case_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    potency: text().notNull(),
    remedy: text().notNull(),
    rubrics: text().array().notNull().default([]),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_repertorization_branch_id").on(table.branch_id),
    index("idx_healthcare_repertorization_case_id").on(table.case_id),
    index("idx_healthcare_repertorization_patient_id").on(table.patient_id),
  ],
);

export type HealthcareRepertorization = typeof healthcareRepertorization.$inferSelect;
export type NewHealthcareRepertorization = typeof healthcareRepertorization.$inferInsert;

export const healthcareTherapyPackage = pgTable(
  "healthcare_therapy_package",
  {
    branch_id: text().notNull(),
    case_id: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull(),
    total_sittings: integer().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    used_sittings: integer().notNull().default(0),
    valid_till: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("idx_healthcare_therapy_package_branch_id").on(table.branch_id),
    index("idx_healthcare_therapy_package_patient_id").on(table.patient_id),
    index("idx_healthcare_therapy_package_status").on(table.status),
  ],
);

export type HealthcareTherapyPackage = typeof healthcareTherapyPackage.$inferSelect;
export type NewHealthcareTherapyPackage = typeof healthcareTherapyPackage.$inferInsert;

export const healthcareTherapySitting = pgTable(
  "healthcare_therapy_sitting",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    date: date().notNull(),
    id: uuidv7().primaryKey(),
    notes: text(),
    package_id: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    post_bp_dys: integer(),
    post_bp_sys: integer(),
    post_pulse: integer(),
    pre_bp_dys: integer(),
    pre_bp_sys: integer(),
    pre_pulse: integer(),
    status: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_therapy_sitting_branch_id").on(table.branch_id),
    index("idx_healthcare_therapy_sitting_package_id").on(table.package_id),
    index("idx_healthcare_therapy_sitting_patient_id").on(table.patient_id),
    index("idx_healthcare_therapy_sitting_status").on(table.status),
  ],
);

export type HealthcareTherapySitting = typeof healthcareTherapySitting.$inferSelect;
export type NewHealthcareTherapySitting = typeof healthcareTherapySitting.$inferInsert;

export const healthcareDietPlan = pgTable(
  "healthcare_diet_plan",
  {
    branch_id: text().notNull(),
    case_id: text(),
    chart: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    valid_from: date().notNull(),
    valid_to: date().notNull(),
  },
  (table) => [
    index("idx_healthcare_diet_plan_branch_id").on(table.branch_id),
    index("idx_healthcare_diet_plan_patient_id").on(table.patient_id),
  ],
);

export type HealthcareDietPlan = typeof healthcareDietPlan.$inferSelect;
export type NewHealthcareDietPlan = typeof healthcareDietPlan.$inferInsert;

export const healthcareYogaBatch = pgTable(
  "healthcare_yoga_batch",
  {
    branch_id: text().notNull(),
    capacity: integer().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    schedule: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_yoga_batch_branch_id").on(table.branch_id),
    index("idx_healthcare_yoga_batch_name").on(table.name),
  ],
);

export type HealthcareYogaBatch = typeof healthcareYogaBatch.$inferSelect;
export type NewHealthcareYogaBatch = typeof healthcareYogaBatch.$inferInsert;

export const healthcareYogaEnrollment = pgTable(
  "healthcare_yoga_enrollment",
  {
    batch_id: text().notNull(),
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_yoga_enrollment_batch_id").on(table.batch_id),
    index("idx_healthcare_yoga_enrollment_branch_id").on(table.branch_id),
    index("idx_healthcare_yoga_enrollment_patient_id").on(table.patient_id),
  ],
);

export type HealthcareYogaEnrollment = typeof healthcareYogaEnrollment.$inferSelect;
export type NewHealthcareYogaEnrollment = typeof healthcareYogaEnrollment.$inferInsert;
