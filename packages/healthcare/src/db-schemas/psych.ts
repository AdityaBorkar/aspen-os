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
} from "drizzle-orm/pg-core";

export const healthcarePsychAssessment = pgTable(
  "healthcare_psych_assessment",
  {
    branch_id: text().notNull(),
    chief_complaint: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text().notNull(),
    history: text().notNull(),
    id: uuidv7().primaryKey(),
    impression: text().notNull(),
    masked: boolean().notNull().default(true),
    mental_status_exam: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_psych_assessment_branch_id").on(table.branch_id),
    index("idx_healthcare_psych_assessment_encounter_id").on(table.encounter_id),
    index("idx_healthcare_psych_assessment_patient_id").on(table.patient_id),
  ],
);

export type HealthcarePsychAssessment = typeof healthcarePsychAssessment.$inferSelect;
export type NewHealthcarePsychAssessment = typeof healthcarePsychAssessment.$inferInsert;

export const healthcareScaleResult = pgTable(
  "healthcare_scale_result",
  {
    assessment_id: text(),
    band: text(),
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    max_score: numeric().notNull(),
    override: boolean().notNull().default(false),
    override_reason: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    scale: text().notNull(),
    score: numeric().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_scale_result_branch_id").on(table.branch_id),
    index("idx_healthcare_scale_result_patient_id").on(table.patient_id),
    index("idx_healthcare_scale_result_scale").on(table.scale),
  ],
);

export type HealthcareScaleResult = typeof healthcareScaleResult.$inferSelect;
export type NewHealthcareScaleResult = typeof healthcareScaleResult.$inferInsert;

export const healthcareRiskFlag = pgTable(
  "healthcare_risk_flag",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text().notNull(),
    factors: text().array().notNull().default([]),
    id: uuidv7().primaryKey(),
    level: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_risk_flag_branch_id").on(table.branch_id),
    index("idx_healthcare_risk_flag_level").on(table.level),
    index("idx_healthcare_risk_flag_patient_id").on(table.patient_id),
  ],
);

export type HealthcareRiskFlag = typeof healthcareRiskFlag.$inferSelect;
export type NewHealthcareRiskFlag = typeof healthcareRiskFlag.$inferInsert;

export const healthcareSafetyPlan = pgTable(
  "healthcare_safety_plan",
  {
    branch_id: text().notNull(),
    contacts: text().array().notNull().default([]),
    coping_strategies: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    means_restriction: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    warning_signs: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_safety_plan_branch_id").on(table.branch_id),
    index("idx_healthcare_safety_plan_patient_id").on(table.patient_id),
  ],
);

export type HealthcareSafetyPlan = typeof healthcareSafetyPlan.$inferSelect;
export type NewHealthcareSafetyPlan = typeof healthcareSafetyPlan.$inferInsert;

export const healthcareCounsellingSession = pgTable(
  "healthcare_counselling_session",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    date: date().notNull(),
    duration_mins: integer().notNull(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    mode: text().notNull(),
    notes: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull().default("Booked"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_counselling_session_branch_id").on(table.branch_id),
    index("idx_healthcare_counselling_session_date").on(table.date),
    index("idx_healthcare_counselling_session_patient_id").on(table.patient_id),
  ],
);

export type HealthcareCounsellingSession = typeof healthcareCounsellingSession.$inferSelect;
export type NewHealthcareCounsellingSession = typeof healthcareCounsellingSession.$inferInsert;

export const healthcareAddictionChart = pgTable(
  "healthcare_addiction_chart",
  {
    band: text(),
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    score: numeric().notNull(),
    tool: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_addiction_chart_branch_id").on(table.branch_id),
    index("idx_healthcare_addiction_chart_patient_id").on(table.patient_id),
    index("idx_healthcare_addiction_chart_tool").on(table.tool),
  ],
);

export type HealthcareAddictionChart = typeof healthcareAddictionChart.$inferSelect;
export type NewHealthcareAddictionChart = typeof healthcareAddictionChart.$inferInsert;

export const healthcareRelapsePlan = pgTable(
  "healthcare_relapse_plan",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    responses: text().notNull(),
    support_contacts: text().array().notNull().default([]),
    triggers: text().array().notNull().default([]),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_relapse_plan_branch_id").on(table.branch_id),
    index("idx_healthcare_relapse_plan_patient_id").on(table.patient_id),
  ],
);

export type HealthcareRelapsePlan = typeof healthcareRelapsePlan.$inferSelect;
export type NewHealthcareRelapsePlan = typeof healthcareRelapsePlan.$inferInsert;

export const healthcareControlledPrescription = pgTable(
  "healthcare_controlled_prescription",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    days_supply: integer().notNull(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    last_refill_at: timestamp({ withTimezone: true }),
    medicine: text().notNull(),
    override: boolean().notNull().default(false),
    override_reason: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    qty: integer().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_controlled_prescription_branch_id").on(table.branch_id),
    index("idx_healthcare_controlled_prescription_medicine").on(table.medicine),
    index("idx_healthcare_controlled_prescription_patient_id").on(table.patient_id),
  ],
);

export type HealthcareControlledPrescription = typeof healthcareControlledPrescription.$inferSelect;
export type NewHealthcareControlledPrescription =
  typeof healthcareControlledPrescription.$inferInsert;

export const healthcareSideEffectCheck = pgTable(
  "healthcare_side_effect_check",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    effects: text().array().notNull().default([]),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    prescription_id: text().notNull(),
    severity: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_side_effect_check_branch_id").on(table.branch_id),
    index("idx_healthcare_side_effect_check_patient_id").on(table.patient_id),
    index("idx_healthcare_side_effect_check_prescription_id").on(table.prescription_id),
  ],
);

export type HealthcareSideEffectCheck = typeof healthcareSideEffectCheck.$inferSelect;
export type NewHealthcareSideEffectCheck = typeof healthcareSideEffectCheck.$inferInsert;

export const healthcareCaregiverConsent = pgTable(
  "healthcare_caregiver_consent",
  {
    branch_id: text().notNull(),
    caregiver_name: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    relation: text().notNull(),
    scope: text().notNull(),
    status: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_caregiver_consent_branch_id").on(table.branch_id),
    index("idx_healthcare_caregiver_consent_patient_id").on(table.patient_id),
    index("idx_healthcare_caregiver_consent_status").on(table.status),
  ],
);

export type HealthcareCaregiverConsent = typeof healthcareCaregiverConsent.$inferSelect;
export type NewHealthcareCaregiverConsent = typeof healthcareCaregiverConsent.$inferInsert;
