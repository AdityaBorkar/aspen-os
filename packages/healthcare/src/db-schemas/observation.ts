import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareObservation = pgTable(
  "healthcare_observation",
  {
    branch_id: text().notNull().default("main"),
    code: text().notNull(),
    code_system: text().notNull().default("LOINC"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    effective_at: timestamp({ withTimezone: true }).notNull(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    interpretation: text(),
    method: text(),
    note: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    performer_id: text(),
    profile: text().notNull(),
    reference_high: numeric(),
    reference_low: numeric(),
    source: text().notNull(),
    status: text().notNull().default("final"),
    unit: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    value_coding: text(),
    value_number: numeric(),
    value_system: text(),
    value_text: text(),
  },
  (table) => [
    index("idx_healthcare_observation_branch_id").on(table.branch_id),
    index("idx_healthcare_observation_patient_id").on(table.patient_id),
    index("idx_healthcare_observation_encounter_id").on(table.encounter_id),
    index("idx_healthcare_observation_profile").on(table.profile),
    index("idx_healthcare_observation_code").on(table.code),
    index("idx_healthcare_observation_effective_at").on(table.effective_at),
  ],
);

export type HealthcareObservation = typeof healthcareObservation.$inferSelect;
export type NewHealthcareObservation = typeof healthcareObservation.$inferInsert;
