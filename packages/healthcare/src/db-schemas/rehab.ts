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

export const healthcareRehabEpisode = pgTable(
  "healthcare_rehab_episode",
  {
    branch_id: text().notNull(),
    condition: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    discipline: text().notNull(),
    encounter_id: text(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_rehab_episode_branch_id").on(table.branch_id),
    index("idx_healthcare_rehab_episode_discipline").on(table.discipline),
    index("idx_healthcare_rehab_episode_patient_id").on(table.patient_id),
    index("idx_healthcare_rehab_episode_status").on(table.status),
  ],
);

export type HealthcareRehabEpisode = typeof healthcareRehabEpisode.$inferSelect;
export type NewHealthcareRehabEpisode = typeof healthcareRehabEpisode.$inferInsert;

export const healthcareRehabAssessment = pgTable(
  "healthcare_rehab_assessment",
  {
    band: text(),
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    details: text(),
    episode_id: text().notNull(),
    id: uuidv7().primaryKey(),
    max_score: numeric(),
    npo_flag: boolean().notNull().default(false),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    score: numeric().notNull(),
    status: text().notNull(),
    tool: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_rehab_assessment_branch_id").on(table.branch_id),
    index("idx_healthcare_rehab_assessment_episode_id").on(table.episode_id),
    index("idx_healthcare_rehab_assessment_patient_id").on(table.patient_id),
    index("idx_healthcare_rehab_assessment_tool").on(table.tool),
  ],
);

export type HealthcareRehabAssessment = typeof healthcareRehabAssessment.$inferSelect;
export type NewHealthcareRehabAssessment = typeof healthcareRehabAssessment.$inferInsert;

export const healthcareRehabGoal = pgTable(
  "healthcare_rehab_goal",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    episode_id: text().notNull(),
    goal: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull(),
    target_date: date(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_rehab_goal_branch_id").on(table.branch_id),
    index("idx_healthcare_rehab_goal_episode_id").on(table.episode_id),
    index("idx_healthcare_rehab_goal_patient_id").on(table.patient_id),
    index("idx_healthcare_rehab_goal_status").on(table.status),
  ],
);

export type HealthcareRehabGoal = typeof healthcareRehabGoal.$inferSelect;
export type NewHealthcareRehabGoal = typeof healthcareRehabGoal.$inferInsert;

export const healthcareRehabSitting = pgTable(
  "healthcare_rehab_sitting",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    date: date().notNull(),
    episode_id: text().notNull(),
    id: uuidv7().primaryKey(),
    modality: text(),
    notes: text(),
    package_id: text(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    post_bp_dys: integer(),
    post_bp_sys: integer(),
    post_pulse: integer(),
    pre_bp_dys: integer(),
    pre_bp_sys: integer(),
    pre_pulse: integer(),
    slot: text(),
    status: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_rehab_sitting_branch_id").on(table.branch_id),
    index("idx_healthcare_rehab_sitting_episode_id").on(table.episode_id),
    index("idx_healthcare_rehab_sitting_patient_id").on(table.patient_id),
    index("idx_healthcare_rehab_sitting_status").on(table.status),
  ],
);

export type HealthcareRehabSitting = typeof healthcareRehabSitting.$inferSelect;
export type NewHealthcareRehabSitting = typeof healthcareRehabSitting.$inferInsert;

export const healthcareExerciseSheet = pgTable(
  "healthcare_exercise_sheet",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    episode_id: text().notNull(),
    exercises: jsonb().$type<Record<string, JsonValue>[]>().notNull().default([]),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_exercise_sheet_branch_id").on(table.branch_id),
    index("idx_healthcare_exercise_sheet_episode_id").on(table.episode_id),
    index("idx_healthcare_exercise_sheet_patient_id").on(table.patient_id),
  ],
);

export type HealthcareExerciseSheet = typeof healthcareExerciseSheet.$inferSelect;
export type NewHealthcareExerciseSheet = typeof healthcareExerciseSheet.$inferInsert;

export const healthcareOutcomeScore = pgTable(
  "healthcare_outcome_score",
  {
    band: text(),
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    episode_id: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    score: numeric().notNull(),
    tool: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_outcome_score_branch_id").on(table.branch_id),
    index("idx_healthcare_outcome_score_episode_id").on(table.episode_id),
    index("idx_healthcare_outcome_score_patient_id").on(table.patient_id),
    index("idx_healthcare_outcome_score_tool").on(table.tool),
  ],
);

export type HealthcareOutcomeScore = typeof healthcareOutcomeScore.$inferSelect;
export type NewHealthcareOutcomeScore = typeof healthcareOutcomeScore.$inferInsert;

export const healthcareRehabDischarge = pgTable(
  "healthcare_rehab_discharge",
  {
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    episode_id: text().notNull(),
    id: uuidv7().primaryKey(),
    outcome: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    summary: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_rehab_discharge_branch_id").on(table.branch_id),
    index("idx_healthcare_rehab_discharge_episode_id").on(table.episode_id),
    index("idx_healthcare_rehab_discharge_patient_id").on(table.patient_id),
  ],
);

export type HealthcareRehabDischarge = typeof healthcareRehabDischarge.$inferSelect;
export type NewHealthcareRehabDischarge = typeof healthcareRehabDischarge.$inferInsert;
