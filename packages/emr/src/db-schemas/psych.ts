// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcarePsychAssessment: typeof dbSchema.healthcarePsychAssessment =
  dbSchema.healthcarePsychAssessment;
export const healthcareScaleResult: typeof dbSchema.healthcareScaleResult =
  dbSchema.healthcareScaleResult;
export const healthcareRiskFlag: typeof dbSchema.healthcareRiskFlag = dbSchema.healthcareRiskFlag;
export const healthcareSafetyPlan: typeof dbSchema.healthcareSafetyPlan =
  dbSchema.healthcareSafetyPlan;
export const healthcareCounsellingSession: typeof dbSchema.healthcareCounsellingSession =
  dbSchema.healthcareCounsellingSession;
export const healthcareAddictionChart: typeof dbSchema.healthcareAddictionChart =
  dbSchema.healthcareAddictionChart;
export const healthcareRelapsePlan: typeof dbSchema.healthcareRelapsePlan =
  dbSchema.healthcareRelapsePlan;
export const healthcareControlledPrescription: typeof dbSchema.healthcareControlledPrescription =
  dbSchema.healthcareControlledPrescription;
export const healthcareSideEffectCheck: typeof dbSchema.healthcareSideEffectCheck =
  dbSchema.healthcareSideEffectCheck;
export const healthcareCaregiverConsent: typeof dbSchema.healthcareCaregiverConsent =
  dbSchema.healthcareCaregiverConsent;
export type HealthcarePsychAssessment = typeof dbSchema.healthcarePsychAssessment.$inferSelect;
export type NewHealthcarePsychAssessment = typeof dbSchema.healthcarePsychAssessment.$inferInsert;
export type HealthcareScaleResult = typeof dbSchema.healthcareScaleResult.$inferSelect;
export type NewHealthcareScaleResult = typeof dbSchema.healthcareScaleResult.$inferInsert;
export type HealthcareRiskFlag = typeof dbSchema.healthcareRiskFlag.$inferSelect;
export type NewHealthcareRiskFlag = typeof dbSchema.healthcareRiskFlag.$inferInsert;
export type HealthcareSafetyPlan = typeof dbSchema.healthcareSafetyPlan.$inferSelect;
export type NewHealthcareSafetyPlan = typeof dbSchema.healthcareSafetyPlan.$inferInsert;
export type HealthcareCounsellingSession =
  typeof dbSchema.healthcareCounsellingSession.$inferSelect;
export type NewHealthcareCounsellingSession =
  typeof dbSchema.healthcareCounsellingSession.$inferInsert;
export type HealthcareAddictionChart = typeof dbSchema.healthcareAddictionChart.$inferSelect;
export type NewHealthcareAddictionChart = typeof dbSchema.healthcareAddictionChart.$inferInsert;
export type HealthcareRelapsePlan = typeof dbSchema.healthcareRelapsePlan.$inferSelect;
export type NewHealthcareRelapsePlan = typeof dbSchema.healthcareRelapsePlan.$inferInsert;
export type HealthcareControlledPrescription =
  typeof dbSchema.healthcareControlledPrescription.$inferSelect;
export type NewHealthcareControlledPrescription =
  typeof dbSchema.healthcareControlledPrescription.$inferInsert;
export type HealthcareSideEffectCheck = typeof dbSchema.healthcareSideEffectCheck.$inferSelect;
export type NewHealthcareSideEffectCheck = typeof dbSchema.healthcareSideEffectCheck.$inferInsert;
export type HealthcareCaregiverConsent = typeof dbSchema.healthcareCaregiverConsent.$inferSelect;
export type NewHealthcareCaregiverConsent = typeof dbSchema.healthcareCaregiverConsent.$inferInsert;
