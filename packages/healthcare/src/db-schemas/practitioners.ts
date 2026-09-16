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

export const healthcarePractitioner = pgTable(
  "healthcare_practitioner",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    email: text(),
    // D7 soft ref: informational link to the HR employee record. HR owns
    // employment truth; healthcare never joins on this column.
    employee_id: text(),
    id: uuidv7().primaryKey(),
    languages: text().array().notNull().default([]),
    name: text().notNull(),
    overall_yrs: integer(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    phone: text(),
    specialist_yrs: integer(),
    specialty: text(),
    status: text().notNull().default("active"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_practitioner_branch_id").on(table.branch_id),
    index("idx_healthcare_practitioner_status").on(table.status),
  ],
);

export type HealthcarePractitioner = typeof healthcarePractitioner.$inferSelect;
export type NewHealthcarePractitioner = typeof healthcarePractitioner.$inferInsert;

export const healthcarePractitionerRegistration = pgTable(
  "healthcare_practitioner_registration",
  {
    branch_id: text().notNull().default("main"),
    council: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    practitioner_id: text().notNull(),
    reg_no: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    year: integer(),
  },
  (table) => [
    index("idx_healthcare_practitioner_registration_branch_id").on(table.branch_id),
    index("idx_healthcare_practitioner_registration_practitioner_id").on(table.practitioner_id),
  ],
);

export type HealthcarePractitionerRegistration =
  typeof healthcarePractitionerRegistration.$inferSelect;
export type NewHealthcarePractitionerRegistration =
  typeof healthcarePractitionerRegistration.$inferInsert;

export const healthcarePractitionerEducation = pgTable(
  "healthcare_practitioner_education",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    degree: text().notNull(),
    id: uuidv7().primaryKey(),
    institute: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    practitioner_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    year: integer(),
  },
  (table) => [
    index("idx_healthcare_practitioner_education_branch_id").on(table.branch_id),
    index("idx_healthcare_practitioner_education_practitioner_id").on(table.practitioner_id),
  ],
);

export type HealthcarePractitionerEducation = typeof healthcarePractitionerEducation.$inferSelect;
export type NewHealthcarePractitionerEducation =
  typeof healthcarePractitionerEducation.$inferInsert;

export const healthcarePosting = pgTable(
  "healthcare_posting",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    facility_id: text(),
    from_date: date().notNull(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    practitioner_id: text().notNull(),
    to_date: date(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_posting_branch_id").on(table.branch_id),
    index("idx_healthcare_posting_practitioner_id").on(table.practitioner_id),
  ],
);

export type HealthcarePosting = typeof healthcarePosting.$inferSelect;
export type NewHealthcarePosting = typeof healthcarePosting.$inferInsert;

export const healthcarePractitionerSchedule = pgTable(
  "healthcare_practitioner_schedule",
  {
    branch_id: text().notNull().default("main"),
    buffer_min: integer().notNull().default(0),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    emergency_count: integer().notNull().default(0),
    end_time: text().notNull(),
    facility_id: text(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    practitioner_id: text().notNull(),
    slot_min: integer().notNull().default(15),
    start_time: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    video_flag: boolean().notNull().default(false),
    weekday: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_practitioner_schedule_branch_id").on(table.branch_id),
    index("idx_healthcare_practitioner_schedule_practitioner_id").on(table.practitioner_id),
  ],
);

export type HealthcarePractitionerSchedule = typeof healthcarePractitionerSchedule.$inferSelect;
export type NewHealthcarePractitionerSchedule = typeof healthcarePractitionerSchedule.$inferInsert;

export const healthcarePractitionerFee = pgTable(
  "healthcare_practitioner_fee",
  {
    amount: numeric().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    effective_from: date(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    practitioner_id: text().notNull(),
    service_id: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_practitioner_fee_branch_id").on(table.branch_id),
    index("idx_healthcare_practitioner_fee_practitioner_id").on(table.practitioner_id),
  ],
);

export type HealthcarePractitionerFee = typeof healthcarePractitionerFee.$inferSelect;
export type NewHealthcarePractitionerFee = typeof healthcarePractitionerFee.$inferInsert;

export const healthcareLeaveBlock = pgTable(
  "healthcare_leave_block",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    from_date: date().notNull(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    practitioner_id: text().notNull(),
    reason: text(),
    to_date: date().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_leave_block_branch_id").on(table.branch_id),
    index("idx_healthcare_leave_block_practitioner_id").on(table.practitioner_id),
  ],
);

export type HealthcareLeaveBlock = typeof healthcareLeaveBlock.$inferSelect;
export type NewHealthcareLeaveBlock = typeof healthcareLeaveBlock.$inferInsert;
