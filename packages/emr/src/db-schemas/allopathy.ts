// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareSoapNote: typeof dbSchema.healthcareSoapNote = dbSchema.healthcareSoapNote;
export const healthcareExamFinding: typeof dbSchema.healthcareExamFinding =
  dbSchema.healthcareExamFinding;
export const healthcareChronicLog: typeof dbSchema.healthcareChronicLog =
  dbSchema.healthcareChronicLog;
export const healthcareImmunization: typeof dbSchema.healthcareImmunization =
  dbSchema.healthcareImmunization;
export const healthcareRegisterEntry: typeof dbSchema.healthcareRegisterEntry =
  dbSchema.healthcareRegisterEntry;
export const healthcareTriageEntry: typeof dbSchema.healthcareTriageEntry =
  dbSchema.healthcareTriageEntry;
export const healthcareProblem: typeof dbSchema.healthcareProblem = dbSchema.healthcareProblem;
export type HealthcareSoapNote = typeof dbSchema.healthcareSoapNote.$inferSelect;
export type NewHealthcareSoapNote = typeof dbSchema.healthcareSoapNote.$inferInsert;
export type HealthcareExamFinding = typeof dbSchema.healthcareExamFinding.$inferSelect;
export type NewHealthcareExamFinding = typeof dbSchema.healthcareExamFinding.$inferInsert;
export type HealthcareChronicLog = typeof dbSchema.healthcareChronicLog.$inferSelect;
export type NewHealthcareChronicLog = typeof dbSchema.healthcareChronicLog.$inferInsert;
export type HealthcareImmunization = typeof dbSchema.healthcareImmunization.$inferSelect;
export type NewHealthcareImmunization = typeof dbSchema.healthcareImmunization.$inferInsert;
export type HealthcareRegisterEntry = typeof dbSchema.healthcareRegisterEntry.$inferSelect;
export type NewHealthcareRegisterEntry = typeof dbSchema.healthcareRegisterEntry.$inferInsert;
export type HealthcareTriageEntry = typeof dbSchema.healthcareTriageEntry.$inferSelect;
export type NewHealthcareTriageEntry = typeof dbSchema.healthcareTriageEntry.$inferInsert;
export type HealthcareProblem = typeof dbSchema.healthcareProblem.$inferSelect;
export type NewHealthcareProblem = typeof dbSchema.healthcareProblem.$inferInsert;
