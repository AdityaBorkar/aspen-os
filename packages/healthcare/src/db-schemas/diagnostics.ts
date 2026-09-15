import { healthcareLabOrderStatusEnum, healthcareRadioOrderStatusEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
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

function branchCol() {
  return { branch_id: text().notNull().default("main") };
}

function payloadCol() {
  return { payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}) };
}

export const healthcareLabTest = pgTable(
  "healthcare_lab_test",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    code: text().notNull(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    price: numeric(),
    ref_high: numeric(),
    ref_low: numeric(),
    reference_uom_category: text(),
    reference_uom_id: text(),
    specimen: text(),
    turnaround_hrs: integer(),
  },
  (table) => [
    uniqueIndex("idx_healthcare_lab_test_code").on(table.code),
    index("idx_healthcare_lab_test_branch_id").on(table.branch_id),
    index("idx_healthcare_lab_test_name").on(table.name),
  ],
);

export type HealthcareLabTest = typeof healthcareLabTest.$inferSelect;
export type NewHealthcareLabTest = typeof healthcareLabTest.$inferInsert;

export const healthcareLabPanel = pgTable(
  "healthcare_lab_panel",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    test_ids: text().array().notNull().default([]),
  },
  (table) => [
    index("idx_healthcare_lab_panel_branch_id").on(table.branch_id),
    index("idx_healthcare_lab_panel_name").on(table.name),
  ],
);

export type HealthcareLabPanel = typeof healthcareLabPanel.$inferSelect;
export type NewHealthcareLabPanel = typeof healthcareLabPanel.$inferInsert;

export const healthcareLabOrder = pgTable(
  "healthcare_lab_order",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    dx: text(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    is_billed: boolean().notNull().default(false),
    order_no: text().notNull(),
    patient_id: text().notNull(),
    payer: text(),
    priority: text().notNull().default("routine"),
    status: healthcareLabOrderStatusEnum().notNull().default("ordered"),
  },
  (table) => [
    uniqueIndex("idx_healthcare_lab_order_no").on(table.order_no),
    index("idx_healthcare_lab_order_branch_id").on(table.branch_id),
    index("idx_healthcare_lab_order_patient_id").on(table.patient_id),
    index("idx_healthcare_lab_order_encounter_id").on(table.encounter_id),
    index("idx_healthcare_lab_order_status").on(table.status),
    index("idx_healthcare_lab_order_priority").on(table.priority),
  ],
);

export type HealthcareLabOrder = typeof healthcareLabOrder.$inferSelect;
export type NewHealthcareLabOrder = typeof healthcareLabOrder.$inferInsert;

export const healthcareLabSample = pgTable(
  "healthcare_lab_sample",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    barcode: text().notNull(),
    collected_at: timestamp({ withTimezone: true }),
    collected_by: text(),
    id: uuidv7().primaryKey(),
    order_id: text().notNull(),
    received_at: timestamp({ withTimezone: true }),
    status: text().notNull().default("collected"),
  },
  (table) => [
    uniqueIndex("idx_healthcare_lab_sample_barcode").on(table.barcode),
    index("idx_healthcare_lab_sample_branch_id").on(table.branch_id),
    index("idx_healthcare_lab_sample_order_id").on(table.order_id),
    index("idx_healthcare_lab_sample_status").on(table.status),
  ],
);

export type HealthcareLabSample = typeof healthcareLabSample.$inferSelect;
export type NewHealthcareLabSample = typeof healthcareLabSample.$inferInsert;

export const healthcareLabResult = pgTable(
  "healthcare_lab_result",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    entered_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    entered_by: text().notNull(),
    flag: text().notNull().default("normal"),
    id: uuidv7().primaryKey(),
    order_id: text().notNull(),
    test_code: text().notNull(),
    value: text().notNull(),
    version: integer().notNull().default(1),
  },
  (table) => [
    index("idx_healthcare_lab_result_branch_id").on(table.branch_id),
    index("idx_healthcare_lab_result_order_id").on(table.order_id),
    index("idx_healthcare_lab_result_test_code").on(table.test_code),
    index("idx_healthcare_lab_result_flag").on(table.flag),
  ],
);

export type HealthcareLabResult = typeof healthcareLabResult.$inferSelect;
export type NewHealthcareLabResult = typeof healthcareLabResult.$inferInsert;

export const healthcareRadioBooking = pgTable(
  "healthcare_radio_booking",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    booking_no: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    referred_by: text(),
    service: text().notNull(),
    slot: text().notNull(),
    status: healthcareRadioOrderStatusEnum().notNull().default("booked"),
  },
  (table) => [
    uniqueIndex("idx_healthcare_radio_booking_no").on(table.booking_no),
    index("idx_healthcare_radio_booking_branch_id").on(table.branch_id),
    index("idx_healthcare_radio_booking_patient_id").on(table.patient_id),
    index("idx_healthcare_radio_booking_service").on(table.service),
    index("idx_healthcare_radio_booking_status").on(table.status),
  ],
);

export type HealthcareRadioBooking = typeof healthcareRadioBooking.$inferSelect;
export type NewHealthcareRadioBooking = typeof healthcareRadioBooking.$inferInsert;

export const healthcareRadioReport = pgTable(
  "healthcare_radio_report",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    authorized_by: text(),
    booking_id: text().notNull(),
    id: uuidv7().primaryKey(),
    impression: text(),
    report_path: text().notNull(),
    status: text().notNull().default("draft"),
    version: integer().notNull().default(1),
  },
  (table) => [
    uniqueIndex("idx_healthcare_radio_report_version").on(table.booking_id, table.version),
    index("idx_healthcare_radio_report_branch_id").on(table.branch_id),
    index("idx_healthcare_radio_report_booking_id").on(table.booking_id),
    index("idx_healthcare_radio_report_status").on(table.status),
  ],
);

export type HealthcareRadioReport = typeof healthcareRadioReport.$inferSelect;
export type NewHealthcareRadioReport = typeof healthcareRadioReport.$inferInsert;

export const healthcareQcLog = pgTable(
  "healthcare_qc_log",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    equipment: text().notNull(),
    id: uuidv7().primaryKey(),
    logged_by: text().notNull(),
    param: text().notNull(),
    status: text().notNull(),
    value: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_qc_log_branch_id").on(table.branch_id),
    index("idx_healthcare_qc_log_equipment").on(table.equipment),
    index("idx_healthcare_qc_log_status").on(table.status),
  ],
);

export type HealthcareQcLog = typeof healthcareQcLog.$inferSelect;
export type NewHealthcareQcLog = typeof healthcareQcLog.$inferInsert;
