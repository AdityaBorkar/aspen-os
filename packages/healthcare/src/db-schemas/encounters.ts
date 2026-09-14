import { healthcareEncounterStatusEnum } from "#/db-schemas/enums";

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

export const healthcareEncounter = pgTable(
  "healthcare_encounter",
  {
    appointment_id: text(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    specialty: text().notNull(),
    status: healthcareEncounterStatusEnum().notNull().default("open"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    visit_type: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_encounter_branch_id").on(table.branch_id),
    index("idx_healthcare_encounter_patient_id").on(table.patient_id),
    index("idx_healthcare_encounter_appointment_id").on(table.appointment_id),
    index("idx_healthcare_encounter_status").on(table.status),
  ],
);

export type HealthcareEncounter = typeof healthcareEncounter.$inferSelect;
export type NewHealthcareEncounter = typeof healthcareEncounter.$inferInsert;

export const healthcareEncounterDiagnosis = pgTable(
  "healthcare_encounter_diagnosis",
  {
    branch_id: text().notNull().default("main"),
    code: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    is_primary: boolean().notNull().default(false),
    kind: text().notNull().default("provisional"),
    label: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_encounter_diagnosis_branch_id").on(table.branch_id),
    index("idx_healthcare_encounter_diagnosis_encounter_id").on(table.encounter_id),
    index("idx_healthcare_encounter_diagnosis_patient_id").on(table.patient_id),
  ],
);

export type HealthcareEncounterDiagnosis = typeof healthcareEncounterDiagnosis.$inferSelect;
export type NewHealthcareEncounterDiagnosis = typeof healthcareEncounterDiagnosis.$inferInsert;

export const healthcarePrescription = pgTable(
  "healthcare_prescription",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    item_count: integer().notNull().default(0),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_prescription_branch_id").on(table.branch_id),
    index("idx_healthcare_prescription_encounter_id").on(table.encounter_id),
    index("idx_healthcare_prescription_patient_id").on(table.patient_id),
  ],
);

export type HealthcarePrescription = typeof healthcarePrescription.$inferSelect;
export type NewHealthcarePrescription = typeof healthcarePrescription.$inferInsert;

export const healthcareVitals = pgTable(
  "healthcare_vitals",
  {
    bp: text(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    pulse: integer(),
    spo2: integer(),
    temp_c: numeric(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    weight_kg: numeric(),
  },
  (table) => [
    index("idx_healthcare_vitals_branch_id").on(table.branch_id),
    index("idx_healthcare_vitals_encounter_id").on(table.encounter_id),
    index("idx_healthcare_vitals_patient_id").on(table.patient_id),
  ],
);

export type HealthcareVitals = typeof healthcareVitals.$inferSelect;
export type NewHealthcareVitals = typeof healthcareVitals.$inferInsert;

export const healthcareClinicOrder = pgTable(
  "healthcare_clinic_order",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    item: text().notNull(),
    kind: text().notNull(),
    note: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull().default("ordered"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_clinic_order_branch_id").on(table.branch_id),
    index("idx_healthcare_clinic_order_encounter_id").on(table.encounter_id),
    index("idx_healthcare_clinic_order_patient_id").on(table.patient_id),
    index("idx_healthcare_clinic_order_status").on(table.status),
  ],
);

export type HealthcareClinicOrder = typeof healthcareClinicOrder.$inferSelect;
export type NewHealthcareClinicOrder = typeof healthcareClinicOrder.$inferInsert;

export const healthcareFollowUp = pgTable(
  "healthcare_follow_up",
  {
    at: date().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    note: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_follow_up_branch_id").on(table.branch_id),
    index("idx_healthcare_follow_up_encounter_id").on(table.encounter_id),
    index("idx_healthcare_follow_up_patient_id").on(table.patient_id),
  ],
);

export type HealthcareFollowUp = typeof healthcareFollowUp.$inferSelect;
export type NewHealthcareFollowUp = typeof healthcareFollowUp.$inferInsert;

export const healthcareEncounterAddendum = pgTable(
  "healthcare_encounter_addendum",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    note: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_encounter_addendum_branch_id").on(table.branch_id),
    index("idx_healthcare_encounter_addendum_encounter_id").on(table.encounter_id),
  ],
);

export type HealthcareEncounterAddendum = typeof healthcareEncounterAddendum.$inferSelect;
export type NewHealthcareEncounterAddendum = typeof healthcareEncounterAddendum.$inferInsert;
