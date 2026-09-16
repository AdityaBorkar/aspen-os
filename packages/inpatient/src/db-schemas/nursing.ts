// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareNursingTask: typeof dbSchema.healthcareNursingTask =
  dbSchema.healthcareNursingTask;
export const healthcareNursingNote: typeof dbSchema.healthcareNursingNote =
  dbSchema.healthcareNursingNote;
export const healthcareNursingVitals: typeof dbSchema.healthcareNursingVitals =
  dbSchema.healthcareNursingVitals;
export const healthcareIoEntry: typeof dbSchema.healthcareIoEntry = dbSchema.healthcareIoEntry;
export const healthcarePainScore: typeof dbSchema.healthcarePainScore =
  dbSchema.healthcarePainScore;
export const healthcareNursingRiskScreen: typeof dbSchema.healthcareNursingRiskScreen =
  dbSchema.healthcareNursingRiskScreen;
export const healthcareDrugAdministration: typeof dbSchema.healthcareDrugAdministration =
  dbSchema.healthcareDrugAdministration;
export const healthcareNursingEscalation: typeof dbSchema.healthcareNursingEscalation =
  dbSchema.healthcareNursingEscalation;
export const healthcareDaycareSitting: typeof dbSchema.healthcareDaycareSitting =
  dbSchema.healthcareDaycareSitting;
export const healthcareNursingChecklist: typeof dbSchema.healthcareNursingChecklist =
  dbSchema.healthcareNursingChecklist;
export const healthcareHandover: typeof dbSchema.healthcareHandover = dbSchema.healthcareHandover;
export const healthcareTriageTag: typeof dbSchema.healthcareTriageTag =
  dbSchema.healthcareTriageTag;
export type HealthcareNursingTask = typeof dbSchema.healthcareNursingTask.$inferSelect;
export type NewHealthcareNursingTask = typeof dbSchema.healthcareNursingTask.$inferInsert;
export type HealthcareNursingNote = typeof dbSchema.healthcareNursingNote.$inferSelect;
export type NewHealthcareNursingNote = typeof dbSchema.healthcareNursingNote.$inferInsert;
export type HealthcareNursingVitals = typeof dbSchema.healthcareNursingVitals.$inferSelect;
export type NewHealthcareNursingVitals = typeof dbSchema.healthcareNursingVitals.$inferInsert;
export type HealthcareIoEntry = typeof dbSchema.healthcareIoEntry.$inferSelect;
export type NewHealthcareIoEntry = typeof dbSchema.healthcareIoEntry.$inferInsert;
export type HealthcarePainScore = typeof dbSchema.healthcarePainScore.$inferSelect;
export type NewHealthcarePainScore = typeof dbSchema.healthcarePainScore.$inferInsert;
export type HealthcareNursingRiskScreen = typeof dbSchema.healthcareNursingRiskScreen.$inferSelect;
export type NewHealthcareNursingRiskScreen =
  typeof dbSchema.healthcareNursingRiskScreen.$inferInsert;
export type HealthcareDrugAdministration =
  typeof dbSchema.healthcareDrugAdministration.$inferSelect;
export type NewHealthcareDrugAdministration =
  typeof dbSchema.healthcareDrugAdministration.$inferInsert;
export type HealthcareNursingEscalation = typeof dbSchema.healthcareNursingEscalation.$inferSelect;
export type NewHealthcareNursingEscalation =
  typeof dbSchema.healthcareNursingEscalation.$inferInsert;
export type HealthcareDaycareSitting = typeof dbSchema.healthcareDaycareSitting.$inferSelect;
export type NewHealthcareDaycareSitting = typeof dbSchema.healthcareDaycareSitting.$inferInsert;
export type HealthcareNursingChecklist = typeof dbSchema.healthcareNursingChecklist.$inferSelect;
export type NewHealthcareNursingChecklist = typeof dbSchema.healthcareNursingChecklist.$inferInsert;
export type HealthcareHandover = typeof dbSchema.healthcareHandover.$inferSelect;
export type NewHealthcareHandover = typeof dbSchema.healthcareHandover.$inferInsert;
export type HealthcareTriageTag = typeof dbSchema.healthcareTriageTag.$inferSelect;
export type NewHealthcareTriageTag = typeof dbSchema.healthcareTriageTag.$inferInsert;
