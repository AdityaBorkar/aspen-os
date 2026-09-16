// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareResident: typeof dbSchema.healthcareResident = dbSchema.healthcareResident;
export const healthcareBedAssignment: typeof dbSchema.healthcareBedAssignment =
  dbSchema.healthcareBedAssignment;
export const healthcareGeriatricScore: typeof dbSchema.healthcareGeriatricScore =
  dbSchema.healthcareGeriatricScore;
export const healthcarePolypharmacyReview: typeof dbSchema.healthcarePolypharmacyReview =
  dbSchema.healthcarePolypharmacyReview;
export const healthcareDailyLog: typeof dbSchema.healthcareDailyLog = dbSchema.healthcareDailyLog;
export const healthcareRound: typeof dbSchema.healthcareRound = dbSchema.healthcareRound;
export const healthcareVisitLog: typeof dbSchema.healthcareVisitLog = dbSchema.healthcareVisitLog;
export const healthcareStayCharge: typeof dbSchema.healthcareStayCharge =
  dbSchema.healthcareStayCharge;
export type HealthcareResident = typeof dbSchema.healthcareResident.$inferSelect;
export type NewHealthcareResident = typeof dbSchema.healthcareResident.$inferInsert;
export type HealthcareBedAssignment = typeof dbSchema.healthcareBedAssignment.$inferSelect;
export type NewHealthcareBedAssignment = typeof dbSchema.healthcareBedAssignment.$inferInsert;
export type HealthcareGeriatricScore = typeof dbSchema.healthcareGeriatricScore.$inferSelect;
export type NewHealthcareGeriatricScore = typeof dbSchema.healthcareGeriatricScore.$inferInsert;
export type HealthcarePolypharmacyReview =
  typeof dbSchema.healthcarePolypharmacyReview.$inferSelect;
export type NewHealthcarePolypharmacyReview =
  typeof dbSchema.healthcarePolypharmacyReview.$inferInsert;
export type HealthcareDailyLog = typeof dbSchema.healthcareDailyLog.$inferSelect;
export type NewHealthcareDailyLog = typeof dbSchema.healthcareDailyLog.$inferInsert;
export type HealthcareRound = typeof dbSchema.healthcareRound.$inferSelect;
export type NewHealthcareRound = typeof dbSchema.healthcareRound.$inferInsert;
export type HealthcareVisitLog = typeof dbSchema.healthcareVisitLog.$inferSelect;
export type NewHealthcareVisitLog = typeof dbSchema.healthcareVisitLog.$inferInsert;
export type HealthcareStayCharge = typeof dbSchema.healthcareStayCharge.$inferSelect;
export type NewHealthcareStayCharge = typeof dbSchema.healthcareStayCharge.$inferInsert;
