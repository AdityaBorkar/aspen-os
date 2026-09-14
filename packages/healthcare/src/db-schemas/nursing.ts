import { healthcareTaskStatusEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export interface HealthcareChecklistItem {
  done: string;
  label: string;
}

export const healthcareNursingTask = pgTable(
  "healthcare_nursing_task",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    due_at: timestamp({ withTimezone: true }),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    kind: text().notNull().default("general"),
    order_id: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: healthcareTaskStatusEnum().notNull().default("open"),
    title: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_nursing_task_branch_id").on(table.branch_id),
    index("idx_healthcare_nursing_task_patient_id").on(table.patient_id),
    index("idx_healthcare_nursing_task_status").on(table.status),
  ],
);

export const healthcareNursingNote = pgTable(
  "healthcare_nursing_note",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    note: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    recorded_by: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_nursing_note_branch_id").on(table.branch_id),
    index("idx_healthcare_nursing_note_patient_id").on(table.patient_id),
  ],
);

export const healthcareNursingVitals = pgTable(
  "healthcare_nursing_vitals",
  {
    bp_dia: integer(),
    bp_sys: integer(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text(),
    ews: integer().notNull().default(0),
    id: uuidv7().primaryKey(),
    note: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    pulse: integer(),
    rr: integer(),
    spo2: integer(),
    temp: numeric(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_nursing_vitals_branch_id").on(table.branch_id),
    index("idx_healthcare_nursing_vitals_patient_id").on(table.patient_id),
  ],
);

export const healthcareIoEntry = pgTable(
  "healthcare_io_entry",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    intake_ml: integer().notNull().default(0),
    note: text(),
    output_ml: integer().notNull().default(0),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_io_entry_branch_id").on(table.branch_id),
    index("idx_healthcare_io_entry_patient_id").on(table.patient_id),
  ],
);

export const healthcarePainScore = pgTable(
  "healthcare_pain_score",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    note: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    phase: text().notNull(),
    score: integer().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_pain_score_branch_id").on(table.branch_id),
    index("idx_healthcare_pain_score_patient_id").on(table.patient_id),
  ],
);

export const healthcareNursingRiskScreen = pgTable(
  "healthcare_nursing_risk_screen",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    kind: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    precautions: jsonb().$type<string[]>().notNull().default([]),
    score: numeric().notNull(),
    screened_by: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_nursing_risk_screen_branch_id").on(table.branch_id),
    index("idx_healthcare_nursing_risk_screen_patient_id").on(table.patient_id),
  ],
);

export const healthcareDrugAdministration = pgTable(
  "healthcare_drug_administration",
  {
    batch_id: text().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    doctor_override_id: text(),
    dose: text().notNull(),
    drug: text().notNull(),
    given_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    given_by: text(),
    id: uuidv7().primaryKey(),
    note: text(),
    order_id: text(),
    outcome: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    witness: text(),
  },
  (table) => [
    index("idx_healthcare_drug_administration_branch_id").on(table.branch_id),
    index("idx_healthcare_drug_administration_patient_id").on(table.patient_id),
    index("idx_healthcare_drug_administration_outcome").on(table.outcome),
  ],
);

export const healthcareNursingEscalation = pgTable(
  "healthcare_nursing_escalation",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    drug_admin_id: text(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    reason: text().notNull(),
    status: text().notNull().default("open"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_nursing_escalation_branch_id").on(table.branch_id),
    index("idx_healthcare_nursing_escalation_patient_id").on(table.patient_id),
    index("idx_healthcare_nursing_escalation_status").on(table.status),
  ],
);

export const healthcareDaycareSitting = pgTable(
  "healthcare_daycare_sitting",
  {
    branch_id: text().notNull().default("main"),
    consent_id: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    note: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    phase: text().notNull(),
    recorded_by: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_daycare_sitting_branch_id").on(table.branch_id),
    index("idx_healthcare_daycare_sitting_patient_id").on(table.patient_id),
  ],
);

export const healthcareNursingChecklist = pgTable(
  "healthcare_nursing_checklist",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    items: jsonb().$type<HealthcareChecklistItem[]>().notNull().default([]),
    name: text().notNull(),
    patient_id: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_nursing_checklist_branch_id").on(table.branch_id),
    index("idx_healthcare_nursing_checklist_patient_id").on(table.patient_id),
  ],
);

export const healthcareHandover = pgTable(
  "healthcare_handover",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    from_shift: text().notNull(),
    id: uuidv7().primaryKey(),
    notes: text().notNull(),
    open_tasks: jsonb().$type<string[]>().notNull().default([]),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    signed_at: timestamp({ withTimezone: true }),
    signed_by: text(),
    status: text().notNull().default("draft"),
    to_shift: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_handover_branch_id").on(table.branch_id),
    index("idx_healthcare_handover_status").on(table.status),
  ],
);

export const healthcareTriageTag = pgTable(
  "healthcare_triage_tag",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    reason: text().notNull(),
    tag: text().notNull(),
    tagged_by: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_triage_tag_branch_id").on(table.branch_id),
    index("idx_healthcare_triage_tag_patient_id").on(table.patient_id),
    index("idx_healthcare_triage_tag_tag").on(table.tag),
  ],
);

export type HealthcareNursingTask = typeof healthcareNursingTask.$inferSelect;
export type NewHealthcareNursingTask = typeof healthcareNursingTask.$inferInsert;
export type HealthcareNursingNote = typeof healthcareNursingNote.$inferSelect;
export type NewHealthcareNursingNote = typeof healthcareNursingNote.$inferInsert;
export type HealthcareNursingVitals = typeof healthcareNursingVitals.$inferSelect;
export type NewHealthcareNursingVitals = typeof healthcareNursingVitals.$inferInsert;
export type HealthcareIoEntry = typeof healthcareIoEntry.$inferSelect;
export type NewHealthcareIoEntry = typeof healthcareIoEntry.$inferInsert;
export type HealthcarePainScore = typeof healthcarePainScore.$inferSelect;
export type NewHealthcarePainScore = typeof healthcarePainScore.$inferInsert;
export type HealthcareNursingRiskScreen = typeof healthcareNursingRiskScreen.$inferSelect;
export type NewHealthcareNursingRiskScreen = typeof healthcareNursingRiskScreen.$inferInsert;
export type HealthcareDrugAdministration = typeof healthcareDrugAdministration.$inferSelect;
export type NewHealthcareDrugAdministration = typeof healthcareDrugAdministration.$inferInsert;
export type HealthcareNursingEscalation = typeof healthcareNursingEscalation.$inferSelect;
export type NewHealthcareNursingEscalation = typeof healthcareNursingEscalation.$inferInsert;
export type HealthcareDaycareSitting = typeof healthcareDaycareSitting.$inferSelect;
export type NewHealthcareDaycareSitting = typeof healthcareDaycareSitting.$inferInsert;
export type HealthcareNursingChecklist = typeof healthcareNursingChecklist.$inferSelect;
export type NewHealthcareNursingChecklist = typeof healthcareNursingChecklist.$inferInsert;
export type HealthcareHandover = typeof healthcareHandover.$inferSelect;
export type NewHealthcareHandover = typeof healthcareHandover.$inferInsert;
export type HealthcareTriageTag = typeof healthcareTriageTag.$inferSelect;
export type NewHealthcareTriageTag = typeof healthcareTriageTag.$inferInsert;
