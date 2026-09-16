import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareCondition = pgTable(
  "healthcare_condition",
  {
    branch_id: text().notNull().default("main"),
    clinical_status: text().notNull().default("active"),
    code: text().notNull(),
    code_system: text().notNull(),
    codings: jsonb().$type<Record<string, JsonValue>[]>().notNull().default([]),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    label: text().notNull(),
    onset_at: timestamp({ withTimezone: true }),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    rank: integer(),
    recorded_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    recorded_by: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    verification_status: text().notNull().default("unconfirmed"),
  },
  (table) => [
    index("idx_healthcare_condition_branch_id").on(table.branch_id),
    index("idx_healthcare_condition_patient_id").on(table.patient_id),
    index("idx_healthcare_condition_encounter_id").on(table.encounter_id),
    index("idx_healthcare_condition_code_system").on(table.code_system),
  ],
);

export type HealthcareCondition = typeof healthcareCondition.$inferSelect;
export type NewHealthcareCondition = typeof healthcareCondition.$inferInsert;
