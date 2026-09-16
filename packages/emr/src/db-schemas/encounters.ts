// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareEncounter: typeof dbSchema.healthcareEncounter =
  dbSchema.healthcareEncounter;
export const healthcareEncounterDiagnosis: typeof dbSchema.healthcareEncounterDiagnosis =
  dbSchema.healthcareEncounterDiagnosis;
export const healthcarePrescription: typeof dbSchema.healthcarePrescription =
  dbSchema.healthcarePrescription;
export const healthcareVitals: typeof dbSchema.healthcareVitals = dbSchema.healthcareVitals;
export const healthcareClinicOrder: typeof dbSchema.healthcareClinicOrder =
  dbSchema.healthcareClinicOrder;
export const healthcareFollowUp: typeof dbSchema.healthcareFollowUp = dbSchema.healthcareFollowUp;
export const healthcareEncounterAddendum: typeof dbSchema.healthcareEncounterAddendum =
  dbSchema.healthcareEncounterAddendum;
export type HealthcareEncounter = typeof dbSchema.healthcareEncounter.$inferSelect;
export type NewHealthcareEncounter = typeof dbSchema.healthcareEncounter.$inferInsert;
export type HealthcareEncounterDiagnosis =
  typeof dbSchema.healthcareEncounterDiagnosis.$inferSelect;
export type NewHealthcareEncounterDiagnosis =
  typeof dbSchema.healthcareEncounterDiagnosis.$inferInsert;
export type HealthcarePrescription = typeof dbSchema.healthcarePrescription.$inferSelect;
export type NewHealthcarePrescription = typeof dbSchema.healthcarePrescription.$inferInsert;
export type HealthcareVitals = typeof dbSchema.healthcareVitals.$inferSelect;
export type NewHealthcareVitals = typeof dbSchema.healthcareVitals.$inferInsert;
export type HealthcareClinicOrder = typeof dbSchema.healthcareClinicOrder.$inferSelect;
export type NewHealthcareClinicOrder = typeof dbSchema.healthcareClinicOrder.$inferInsert;
export type HealthcareFollowUp = typeof dbSchema.healthcareFollowUp.$inferSelect;
export type NewHealthcareFollowUp = typeof dbSchema.healthcareFollowUp.$inferInsert;
export type HealthcareEncounterAddendum = typeof dbSchema.healthcareEncounterAddendum.$inferSelect;
export type NewHealthcareEncounterAddendum =
  typeof dbSchema.healthcareEncounterAddendum.$inferInsert;
