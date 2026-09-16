// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareRehabEpisode: typeof dbSchema.healthcareRehabEpisode =
  dbSchema.healthcareRehabEpisode;
export const healthcareRehabAssessment: typeof dbSchema.healthcareRehabAssessment =
  dbSchema.healthcareRehabAssessment;
export const healthcareRehabGoal: typeof dbSchema.healthcareRehabGoal =
  dbSchema.healthcareRehabGoal;
export const healthcareRehabSitting: typeof dbSchema.healthcareRehabSitting =
  dbSchema.healthcareRehabSitting;
export const healthcareExerciseSheet: typeof dbSchema.healthcareExerciseSheet =
  dbSchema.healthcareExerciseSheet;
export const healthcareOutcomeScore: typeof dbSchema.healthcareOutcomeScore =
  dbSchema.healthcareOutcomeScore;
export const healthcareRehabDischarge: typeof dbSchema.healthcareRehabDischarge =
  dbSchema.healthcareRehabDischarge;
export type HealthcareRehabEpisode = typeof dbSchema.healthcareRehabEpisode.$inferSelect;
export type NewHealthcareRehabEpisode = typeof dbSchema.healthcareRehabEpisode.$inferInsert;
export type HealthcareRehabAssessment = typeof dbSchema.healthcareRehabAssessment.$inferSelect;
export type NewHealthcareRehabAssessment = typeof dbSchema.healthcareRehabAssessment.$inferInsert;
export type HealthcareRehabGoal = typeof dbSchema.healthcareRehabGoal.$inferSelect;
export type NewHealthcareRehabGoal = typeof dbSchema.healthcareRehabGoal.$inferInsert;
export type HealthcareRehabSitting = typeof dbSchema.healthcareRehabSitting.$inferSelect;
export type NewHealthcareRehabSitting = typeof dbSchema.healthcareRehabSitting.$inferInsert;
export type HealthcareExerciseSheet = typeof dbSchema.healthcareExerciseSheet.$inferSelect;
export type NewHealthcareExerciseSheet = typeof dbSchema.healthcareExerciseSheet.$inferInsert;
export type HealthcareOutcomeScore = typeof dbSchema.healthcareOutcomeScore.$inferSelect;
export type NewHealthcareOutcomeScore = typeof dbSchema.healthcareOutcomeScore.$inferInsert;
export type HealthcareRehabDischarge = typeof dbSchema.healthcareRehabDischarge.$inferSelect;
export type NewHealthcareRehabDischarge = typeof dbSchema.healthcareRehabDischarge.$inferInsert;
