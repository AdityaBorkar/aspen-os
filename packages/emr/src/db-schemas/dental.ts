// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareDentalChart: typeof dbSchema.healthcareDentalChart =
  dbSchema.healthcareDentalChart;
export const healthcareTreatmentPlan: typeof dbSchema.healthcareTreatmentPlan =
  dbSchema.healthcareTreatmentPlan;
export const healthcarePlanStage: typeof dbSchema.healthcarePlanStage =
  dbSchema.healthcarePlanStage;
export const healthcareQuote: typeof dbSchema.healthcareQuote = dbSchema.healthcareQuote;
export const healthcareDentalConsent: typeof dbSchema.healthcareDentalConsent =
  dbSchema.healthcareDentalConsent;
export const healthcareChairSlot: typeof dbSchema.healthcareChairSlot =
  dbSchema.healthcareChairSlot;
export const healthcareLabJob: typeof dbSchema.healthcareLabJob = dbSchema.healthcareLabJob;
export type HealthcareDentalChart = typeof dbSchema.healthcareDentalChart.$inferSelect;
export type NewHealthcareDentalChart = typeof dbSchema.healthcareDentalChart.$inferInsert;
export type HealthcareTreatmentPlan = typeof dbSchema.healthcareTreatmentPlan.$inferSelect;
export type NewHealthcareTreatmentPlan = typeof dbSchema.healthcareTreatmentPlan.$inferInsert;
export type HealthcarePlanStage = typeof dbSchema.healthcarePlanStage.$inferSelect;
export type NewHealthcarePlanStage = typeof dbSchema.healthcarePlanStage.$inferInsert;
export type HealthcareQuote = typeof dbSchema.healthcareQuote.$inferSelect;
export type NewHealthcareQuote = typeof dbSchema.healthcareQuote.$inferInsert;
export type HealthcareDentalConsent = typeof dbSchema.healthcareDentalConsent.$inferSelect;
export type NewHealthcareDentalConsent = typeof dbSchema.healthcareDentalConsent.$inferInsert;
export type HealthcareChairSlot = typeof dbSchema.healthcareChairSlot.$inferSelect;
export type NewHealthcareChairSlot = typeof dbSchema.healthcareChairSlot.$inferInsert;
export type HealthcareLabJob = typeof dbSchema.healthcareLabJob.$inferSelect;
export type NewHealthcareLabJob = typeof dbSchema.healthcareLabJob.$inferInsert;
