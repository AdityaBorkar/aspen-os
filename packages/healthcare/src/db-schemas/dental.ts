import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareDentalChart = pgTable(
  "healthcare_dental_chart",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text().notNull(),
    entries: jsonb().$type<Record<string, JsonValue>[]>().notNull().default([]),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_dental_chart_branch_id").on(table.branch_id),
    index("idx_healthcare_dental_chart_encounter_id").on(table.encounter_id),
    index("idx_healthcare_dental_chart_patient_id").on(table.patient_id),
  ],
);

export type HealthcareDentalChart = typeof healthcareDentalChart.$inferSelect;
export type NewHealthcareDentalChart = typeof healthcareDentalChart.$inferInsert;

export const healthcareTreatmentPlan = pgTable(
  "healthcare_treatment_plan",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_treatment_plan_branch_id").on(table.branch_id),
    index("idx_healthcare_treatment_plan_patient_id").on(table.patient_id),
    index("idx_healthcare_treatment_plan_status").on(table.status),
  ],
);

export type HealthcareTreatmentPlan = typeof healthcareTreatmentPlan.$inferSelect;
export type NewHealthcareTreatmentPlan = typeof healthcareTreatmentPlan.$inferInsert;

export const healthcarePlanStage = pgTable(
  "healthcare_plan_stage",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    plan_id: text().notNull(),
    price: numeric().notNull(),
    procedure: text().notNull(),
    stage: text().notNull(),
    tooth: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_plan_stage_branch_id").on(table.branch_id),
    index("idx_healthcare_plan_stage_plan_id").on(table.plan_id),
    index("idx_healthcare_plan_stage_stage").on(table.stage),
  ],
);

export type HealthcarePlanStage = typeof healthcarePlanStage.$inferSelect;
export type NewHealthcarePlanStage = typeof healthcarePlanStage.$inferInsert;

export const healthcareQuote = pgTable(
  "healthcare_quote",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    discount_pct: numeric().notNull(),
    gst_pct: numeric().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    plan_id: text().notNull(),
    status: text().notNull().default("Draft"),
    subtotal: numeric().notNull(),
    total: numeric().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_quote_branch_id").on(table.branch_id),
    index("idx_healthcare_quote_patient_id").on(table.patient_id),
    index("idx_healthcare_quote_plan_id").on(table.plan_id),
  ],
);

export type HealthcareQuote = typeof healthcareQuote.$inferSelect;
export type NewHealthcareQuote = typeof healthcareQuote.$inferInsert;

export const healthcareDentalConsent = pgTable(
  "healthcare_dental_consent",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    procedure_name: text().notNull(),
    signed_at: timestamp({ withTimezone: true }),
    status: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_dental_consent_branch_id").on(table.branch_id),
    index("idx_healthcare_dental_consent_encounter_id").on(table.encounter_id),
    index("idx_healthcare_dental_consent_patient_id").on(table.patient_id),
    index("idx_healthcare_dental_consent_status").on(table.status),
  ],
);

export type HealthcareDentalConsent = typeof healthcareDentalConsent.$inferSelect;
export type NewHealthcareDentalConsent = typeof healthcareDentalConsent.$inferInsert;

export const healthcareChairSlot = pgTable(
  "healthcare_chair_slot",
  {
    branch_id: text().notNull(),
    chair_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    date: date().notNull(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    slot: text().notNull(),
    status: text().notNull().default("Booked"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_chair_slot_branch_id").on(table.branch_id),
    index("idx_healthcare_chair_slot_chair_id").on(table.chair_id),
    index("idx_healthcare_chair_slot_date").on(table.date),
    index("idx_healthcare_chair_slot_patient_id").on(table.patient_id),
  ],
);

export type HealthcareChairSlot = typeof healthcareChairSlot.$inferSelect;
export type NewHealthcareChairSlot = typeof healthcareChairSlot.$inferInsert;

export const healthcareLabJob = pgTable(
  "healthcare_lab_job",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text(),
    history: jsonb().$type<Record<string, JsonValue>[]>().notNull().default([]),
    id: uuidv7().primaryKey(),
    kind: text().notNull(),
    lab_name: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    plan_id: text(),
    status: text().notNull(),
    tooth: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_lab_job_branch_id").on(table.branch_id),
    index("idx_healthcare_lab_job_patient_id").on(table.patient_id),
    index("idx_healthcare_lab_job_plan_id").on(table.plan_id),
    index("idx_healthcare_lab_job_status").on(table.status),
  ],
);

export type HealthcareLabJob = typeof healthcareLabJob.$inferSelect;
export type NewHealthcareLabJob = typeof healthcareLabJob.$inferInsert;
