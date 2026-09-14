import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareSoapNote = pgTable(
  "healthcare_soap_note",
  {
    assessment: text().notNull(),
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    diagnoses: jsonb().$type<Record<string, JsonValue>[]>().notNull().default([]),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    objective: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    plan: text().notNull(),
    subjective: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_soap_note_branch_id").on(table.branch_id),
    index("idx_healthcare_soap_note_encounter_id").on(table.encounter_id),
    index("idx_healthcare_soap_note_patient_id").on(table.patient_id),
  ],
);

export type HealthcareSoapNote = typeof healthcareSoapNote.$inferSelect;
export type NewHealthcareSoapNote = typeof healthcareSoapNote.$inferInsert;

export const healthcareExamFinding = pgTable(
  "healthcare_exam_finding",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text().notNull(),
    finding: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    severity: text(),
    system: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_exam_finding_branch_id").on(table.branch_id),
    index("idx_healthcare_exam_finding_encounter_id").on(table.encounter_id),
    index("idx_healthcare_exam_finding_patient_id").on(table.patient_id),
  ],
);

export type HealthcareExamFinding = typeof healthcareExamFinding.$inferSelect;
export type NewHealthcareExamFinding = typeof healthcareExamFinding.$inferInsert;

export const healthcareChronicLog = pgTable(
  "healthcare_chronic_log",
  {
    branch_id: text().notNull(),
    condition: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    parameter: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    unit: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    value: numeric().notNull(),
  },
  (table) => [
    index("idx_healthcare_chronic_log_branch_id").on(table.branch_id),
    index("idx_healthcare_chronic_log_condition").on(table.condition),
    index("idx_healthcare_chronic_log_patient_id").on(table.patient_id),
  ],
);

export type HealthcareChronicLog = typeof healthcareChronicLog.$inferSelect;
export type NewHealthcareChronicLog = typeof healthcareChronicLog.$inferInsert;

export const healthcareImmunization = pgTable(
  "healthcare_immunization",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    dose_no: integer().notNull(),
    due_date: text(),
    given_at: text(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    vaccine: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_immunization_branch_id").on(table.branch_id),
    index("idx_healthcare_immunization_patient_id").on(table.patient_id),
    index("idx_healthcare_immunization_status").on(table.status),
  ],
);

export type HealthcareImmunization = typeof healthcareImmunization.$inferSelect;
export type NewHealthcareImmunization = typeof healthcareImmunization.$inferInsert;

export const healthcareRegisterEntry = pgTable(
  "healthcare_register_entry",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    diagnoses: jsonb().$type<Record<string, JsonValue>[]>().notNull().default([]),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    notes: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    register_type: text().notNull(),
    status: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_register_entry_branch_id").on(table.branch_id),
    index("idx_healthcare_register_entry_patient_id").on(table.patient_id),
    index("idx_healthcare_register_entry_register_type").on(table.register_type),
    index("idx_healthcare_register_entry_status").on(table.status),
  ],
);

export type HealthcareRegisterEntry = typeof healthcareRegisterEntry.$inferSelect;
export type NewHealthcareRegisterEntry = typeof healthcareRegisterEntry.$inferInsert;

export const healthcareTriageEntry = pgTable(
  "healthcare_triage_entry",
  {
    bp_dys: integer(),
    bp_sys: integer(),
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    pain_score: integer(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    priority: text().notNull(),
    pulse: integer(),
    rr: integer(),
    spo2: integer(),
    temp_c: numeric(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_triage_entry_branch_id").on(table.branch_id),
    index("idx_healthcare_triage_entry_patient_id").on(table.patient_id),
    index("idx_healthcare_triage_entry_priority").on(table.priority),
  ],
);

export type HealthcareTriageEntry = typeof healthcareTriageEntry.$inferSelect;
export type NewHealthcareTriageEntry = typeof healthcareTriageEntry.$inferInsert;
