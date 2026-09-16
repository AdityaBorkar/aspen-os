import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareClinicalDocument = pgTable(
  "healthcare_clinical_document",
  {
    branch_id: text().notNull().default("main"),
    category_code: text(),
    content_type: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    dms_file_id: text().notNull(),
    doc_status: text(),
    encounter_id: text(),
    file_type: text().notNull(),
    id: uuidv7().primaryKey(),
    label: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    uploaded_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    uploaded_by: text(),
    verified: boolean().notNull().default(false),
    verified_at: timestamp({ withTimezone: true }),
    verified_by: text(),
  },
  (table) => [
    index("idx_healthcare_clinical_document_branch_id").on(table.branch_id),
    index("idx_healthcare_clinical_document_encounter_id").on(table.encounter_id),
    index("idx_healthcare_clinical_document_patient_id").on(table.patient_id),
    index("idx_healthcare_clinical_document_dms_file_id").on(table.dms_file_id),
  ],
);

export const healthcareShareLog = pgTable(
  "healthcare_share_log",
  {
    branch_id: text().notNull().default("main"),
    channel: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    doc_id: text(),
    id: uuidv7().primaryKey(),
    patient_id: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    recipient: text().notNull(),
    shared_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    shared_by: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_share_log_branch_id").on(table.branch_id),
    index("idx_healthcare_share_log_doc_id").on(table.doc_id),
    index("idx_healthcare_share_log_patient_id").on(table.patient_id),
  ],
);

export const healthcareMedicalRegister = pgTable(
  "healthcare_medical_register",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    details: text().notNull(),
    entered_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    entered_by: text(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    register: text().notNull(),
    serial: integer().notNull(),
    status: text().notNull().default("live"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    void_reason: text(),
    voided_at: timestamp({ withTimezone: true }),
    voided_by: text(),
  },
  (table) => [
    index("idx_healthcare_medical_register_branch_id").on(table.branch_id),
    index("idx_healthcare_medical_register_register").on(table.register),
    index("idx_healthcare_medical_register_serial").on(table.serial),
  ],
);

export const healthcareMedicalAddendum = pgTable(
  "healthcare_medical_addendum",
  {
    author_id: text().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
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
    index("idx_healthcare_medical_addendum_branch_id").on(table.branch_id),
    index("idx_healthcare_medical_addendum_encounter_id").on(table.encounter_id),
  ],
);

export const healthcareMergeLog = pgTable(
  "healthcare_merge_log",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    duplicate_id: text().notNull(),
    id: uuidv7().primaryKey(),
    merged_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    merged_by: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    primary_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_merge_log_branch_id").on(table.branch_id),
    index("idx_healthcare_merge_log_primary_id").on(table.primary_id),
  ],
);

export const healthcareDischargeSummary = pgTable(
  "healthcare_discharge_summary",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text().notNull(),
    id: uuidv7().primaryKey(),
    issued_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    issued_by: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    summary: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_discharge_summary_branch_id").on(table.branch_id),
    index("idx_healthcare_discharge_summary_encounter_id").on(table.encounter_id),
  ],
);

export const healthcareConsentGrant = pgTable(
  "healthcare_consent_grant",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text(),
    granted_by: text(),
    id: uuidv7().primaryKey(),
    kind: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull().default("granted"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_consent_grant_branch_id").on(table.branch_id),
    index("idx_healthcare_consent_grant_patient_id").on(table.patient_id),
  ],
);

export type HealthcareClinicalDocument = typeof healthcareClinicalDocument.$inferSelect;
export type NewHealthcareClinicalDocument = typeof healthcareClinicalDocument.$inferInsert;
export type HealthcareShareLog = typeof healthcareShareLog.$inferSelect;
export type NewHealthcareShareLog = typeof healthcareShareLog.$inferInsert;
export type HealthcareMedicalRegister = typeof healthcareMedicalRegister.$inferSelect;
export type NewHealthcareMedicalRegister = typeof healthcareMedicalRegister.$inferInsert;
export type HealthcareMedicalAddendum = typeof healthcareMedicalAddendum.$inferSelect;
export type NewHealthcareMedicalAddendum = typeof healthcareMedicalAddendum.$inferInsert;
export type HealthcareMergeLog = typeof healthcareMergeLog.$inferSelect;
export type NewHealthcareMergeLog = typeof healthcareMergeLog.$inferInsert;
export type HealthcareDischargeSummary = typeof healthcareDischargeSummary.$inferSelect;
export type NewHealthcareDischargeSummary = typeof healthcareDischargeSummary.$inferInsert;
export type HealthcareConsentGrant = typeof healthcareConsentGrant.$inferSelect;
export type NewHealthcareConsentGrant = typeof healthcareConsentGrant.$inferInsert;
