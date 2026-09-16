import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcarePrescriptionLine = pgTable(
  "healthcare_prescription_line",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    days: integer(),
    dose: text(),
    drug: text().notNull(),
    encounter_id: text(),
    frequency: text(),
    id: uuidv7().primaryKey(),
    patient_id: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    performer: text(),
    prescription_id: text().notNull(),
    requester: text(),
    status: text().notNull().default("active"),
    substitution_allowed: boolean().notNull().default(true),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    warnings: text().array().notNull().default([]),
  },
  (table) => [
    index("idx_healthcare_prescription_line_prescription_id").on(table.prescription_id),
    index("idx_healthcare_prescription_line_patient_id").on(table.patient_id),
    index("idx_healthcare_prescription_line_encounter_id").on(table.encounter_id),
  ],
);

export type HealthcarePrescriptionLine = typeof healthcarePrescriptionLine.$inferSelect;
export type NewHealthcarePrescriptionLine = typeof healthcarePrescriptionLine.$inferInsert;
