import {
  healthcareAppointmentStatusEnum,
  healthcareQueueTokenStatusEnum,
} from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareAppointment = pgTable(
  "healthcare_appointment",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    daycare: boolean().notNull().default(false),
    duration_min: integer(),
    facility_id: text(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    practitioner_id: text().notNull(),
    pricelist: text().notNull().default("standard"),
    service_id: text(),
    slot_start: timestamp({ withTimezone: true }).notNull(),
    status: healthcareAppointmentStatusEnum().notNull().default("booked"),
    tele: boolean().notNull().default(false),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_appointment_branch_id").on(table.branch_id),
    index("idx_healthcare_appointment_patient_id").on(table.patient_id),
    index("idx_healthcare_appointment_practitioner_id").on(table.practitioner_id),
    index("idx_healthcare_appointment_facility_id").on(table.facility_id),
    index("idx_healthcare_appointment_service_id").on(table.service_id),
    index("idx_healthcare_appointment_slot_start").on(table.slot_start),
    index("idx_healthcare_appointment_status").on(table.status),
  ],
);

export type HealthcareAppointment = typeof healthcareAppointment.$inferSelect;
export type NewHealthcareAppointment = typeof healthcareAppointment.$inferInsert;

export const healthcareQueueToken = pgTable(
  "healthcare_queue_token",
  {
    branch_id: text().notNull().default("main"),
    called_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    facility_id: text(),
    id: uuidv7().primaryKey(),
    patient_id: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    practitioner_id: text(),
    status: healthcareQueueTokenStatusEnum().notNull().default("waiting"),
    token_no: integer().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    walkin: boolean().notNull().default(false),
  },
  (table) => [
    index("idx_healthcare_queue_token_branch_id").on(table.branch_id),
    index("idx_healthcare_queue_token_patient_id").on(table.patient_id),
    index("idx_healthcare_queue_token_practitioner_id").on(table.practitioner_id),
    index("idx_healthcare_queue_token_status").on(table.status),
  ],
);

export type HealthcareQueueToken = typeof healthcareQueueToken.$inferSelect;
export type NewHealthcareQueueToken = typeof healthcareQueueToken.$inferInsert;

export const healthcareVideoSession = pgTable(
  "healthcare_video_session",
  {
    appointment_id: text().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp({ withTimezone: true }),
    id: uuidv7().primaryKey(),
    join_link: text(),
    patient_id: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    practitioner_id: text(),
    status: text().notNull().default("scheduled"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_video_session_branch_id").on(table.branch_id),
    index("idx_healthcare_video_session_appointment_id").on(table.appointment_id),
    index("idx_healthcare_video_session_status").on(table.status),
  ],
);

export type HealthcareVideoSession = typeof healthcareVideoSession.$inferSelect;
export type NewHealthcareVideoSession = typeof healthcareVideoSession.$inferInsert;

export const healthcareCertificate = pgTable(
  "healthcare_certificate",
  {
    appointment_id: text(),
    body: text().notNull(),
    branch_id: text().notNull().default("main"),
    cert_type: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    patient_id: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull().default("issued"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_certificate_branch_id").on(table.branch_id),
    index("idx_healthcare_certificate_appointment_id").on(table.appointment_id),
    index("idx_healthcare_certificate_patient_id").on(table.patient_id),
    index("idx_healthcare_certificate_status").on(table.status),
  ],
);

export type HealthcareCertificate = typeof healthcareCertificate.$inferSelect;
export type NewHealthcareCertificate = typeof healthcareCertificate.$inferInsert;
