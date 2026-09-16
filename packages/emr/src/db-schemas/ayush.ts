// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareAyushCaseSheet: typeof dbSchema.healthcareAyushCaseSheet =
  dbSchema.healthcareAyushCaseSheet;
export const healthcareRepertorization: typeof dbSchema.healthcareRepertorization =
  dbSchema.healthcareRepertorization;
export const healthcareTherapyPackage: typeof dbSchema.healthcareTherapyPackage =
  dbSchema.healthcareTherapyPackage;
export const healthcareTherapySitting: typeof dbSchema.healthcareTherapySitting =
  dbSchema.healthcareTherapySitting;
export const healthcareDietPlan: typeof dbSchema.healthcareDietPlan = dbSchema.healthcareDietPlan;
export const healthcareYogaBatch: typeof dbSchema.healthcareYogaBatch =
  dbSchema.healthcareYogaBatch;
export const healthcareYogaEnrollment: typeof dbSchema.healthcareYogaEnrollment =
  dbSchema.healthcareYogaEnrollment;
export type HealthcareAyushCaseSheet = typeof dbSchema.healthcareAyushCaseSheet.$inferSelect;
export type NewHealthcareAyushCaseSheet = typeof dbSchema.healthcareAyushCaseSheet.$inferInsert;
export type HealthcareRepertorization = typeof dbSchema.healthcareRepertorization.$inferSelect;
export type NewHealthcareRepertorization = typeof dbSchema.healthcareRepertorization.$inferInsert;
export type HealthcareTherapyPackage = typeof dbSchema.healthcareTherapyPackage.$inferSelect;
export type NewHealthcareTherapyPackage = typeof dbSchema.healthcareTherapyPackage.$inferInsert;
export type HealthcareTherapySitting = typeof dbSchema.healthcareTherapySitting.$inferSelect;
export type NewHealthcareTherapySitting = typeof dbSchema.healthcareTherapySitting.$inferInsert;
export type HealthcareDietPlan = typeof dbSchema.healthcareDietPlan.$inferSelect;
export type NewHealthcareDietPlan = typeof dbSchema.healthcareDietPlan.$inferInsert;
export type HealthcareYogaBatch = typeof dbSchema.healthcareYogaBatch.$inferSelect;
export type NewHealthcareYogaBatch = typeof dbSchema.healthcareYogaBatch.$inferInsert;
export type HealthcareYogaEnrollment = typeof dbSchema.healthcareYogaEnrollment.$inferSelect;
export type NewHealthcareYogaEnrollment = typeof dbSchema.healthcareYogaEnrollment.$inferInsert;
