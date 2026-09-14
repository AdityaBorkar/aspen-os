import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

function timestamps() {
  return {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  };
}

export const healthcarePatient = pgTable(
  "healthcare_patient",
  {
    abha: text(),
    branch_id: text().notNull().default("main"),
    ...timestamps(),
    dob: date(),
    full_name: text().notNull(),
    gender: text(),
    guardian: text(),
    id: uuidv7().primaryKey(),
    language: text().notNull().default("en"),
    merged_into: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    phone: text().notNull(),
    status: text().notNull().default("active"),
    uhid: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_healthcare_patient_uhid").on(table.uhid),
    index("idx_healthcare_patient_branch_id").on(table.branch_id),
    index("idx_healthcare_patient_phone").on(table.phone),
    index("idx_healthcare_patient_abha").on(table.abha),
    index("idx_healthcare_patient_status").on(table.status),
  ],
);

export type HealthcarePatient = typeof healthcarePatient.$inferSelect;
export type NewHealthcarePatient = typeof healthcarePatient.$inferInsert;

export const healthcareFamilyLink = pgTable(
  "healthcare_family_link",
  {
    branch_id: text().notNull().default("main"),
    ...timestamps(),
    id: uuidv7().primaryKey(),
    linked_name: text().notNull(),
    linked_phone: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    relation: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_family_link_patient_id").on(table.patient_id),
    index("idx_healthcare_family_link_branch_id").on(table.branch_id),
  ],
);

export type HealthcareFamilyLink = typeof healthcareFamilyLink.$inferSelect;
export type NewHealthcareFamilyLink = typeof healthcareFamilyLink.$inferInsert;

export const healthcareAllergy = pgTable(
  "healthcare_allergy",
  {
    branch_id: text().notNull().default("main"),
    ...timestamps(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    note: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    severity: text(),
  },
  (table) => [
    index("idx_healthcare_allergy_patient_id").on(table.patient_id),
    index("idx_healthcare_allergy_branch_id").on(table.branch_id),
  ],
);

export type HealthcareAllergy = typeof healthcareAllergy.$inferSelect;
export type NewHealthcareAllergy = typeof healthcareAllergy.$inferInsert;

export const healthcareConsent = pgTable(
  "healthcare_consent",
  {
    archived_at: timestamp({ withTimezone: true }),
    branch_id: text().notNull().default("main"),
    ...timestamps(),
    granted: boolean().notNull().default(false),
    id: uuidv7().primaryKey(),
    note: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    type: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_consent_patient_id").on(table.patient_id),
    index("idx_healthcare_consent_branch_id").on(table.branch_id),
  ],
);

export type HealthcareConsent = typeof healthcareConsent.$inferSelect;
export type NewHealthcareConsent = typeof healthcareConsent.$inferInsert;

export const healthcareFlag = pgTable(
  "healthcare_flag",
  {
    branch_id: text().notNull().default("main"),
    ...timestamps(),
    id: uuidv7().primaryKey(),
    label: text().notNull(),
    level: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [
    index("idx_healthcare_flag_patient_id").on(table.patient_id),
    index("idx_healthcare_flag_branch_id").on(table.branch_id),
  ],
);

export type HealthcareFlag = typeof healthcareFlag.$inferSelect;
export type NewHealthcareFlag = typeof healthcareFlag.$inferInsert;

export const healthcareMergeRequest = pgTable(
  "healthcare_merge_request",
  {
    branch_id: text().notNull().default("main"),
    ...timestamps(),
    decided_at: timestamp({ withTimezone: true }),
    duplicate_id: text().notNull(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    primary_id: text().notNull(),
    reason: text(),
    status: text().notNull().default("pending"),
  },
  (table) => [
    index("idx_healthcare_merge_request_status").on(table.status),
    index("idx_healthcare_merge_request_branch_id").on(table.branch_id),
  ],
);

export type HealthcareMergeRequest = typeof healthcareMergeRequest.$inferSelect;
export type NewHealthcareMergeRequest = typeof healthcareMergeRequest.$inferInsert;

export const healthcareCommunication = pgTable(
  "healthcare_communication",
  {
    branch_id: text().notNull().default("main"),
    channel: text(),
    ...timestamps(),
    id: uuidv7().primaryKey(),
    message: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [
    index("idx_healthcare_communication_patient_id").on(table.patient_id),
    index("idx_healthcare_communication_branch_id").on(table.branch_id),
  ],
);

export type HealthcareCommunication = typeof healthcareCommunication.$inferSelect;
export type NewHealthcareCommunication = typeof healthcareCommunication.$inferInsert;

export const healthcareRecall = pgTable(
  "healthcare_recall",
  {
    at: text().notNull(),
    branch_id: text().notNull().default("main"),
    ...timestamps(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    reason: text().notNull(),
    status: text().notNull().default("open"),
  },
  (table) => [
    index("idx_healthcare_recall_patient_id").on(table.patient_id),
    index("idx_healthcare_recall_status").on(table.status),
  ],
);

export type HealthcareRecall = typeof healthcareRecall.$inferSelect;
export type NewHealthcareRecall = typeof healthcareRecall.$inferInsert;

export const healthcareShareSlip = pgTable(
  "healthcare_share_slip",
  {
    branch_id: text().notNull().default("main"),
    ...timestamps(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    text: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_share_slip_patient_id").on(table.patient_id),
    index("idx_healthcare_share_slip_branch_id").on(table.branch_id),
  ],
);

export type HealthcareShareSlip = typeof healthcareShareSlip.$inferSelect;
export type NewHealthcareShareSlip = typeof healthcareShareSlip.$inferInsert;
