// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcarePatient: typeof dbSchema.healthcarePatient = dbSchema.healthcarePatient;
export const healthcareFamilyLink: typeof dbSchema.healthcareFamilyLink =
  dbSchema.healthcareFamilyLink;
export const healthcareAllergy: typeof dbSchema.healthcareAllergy = dbSchema.healthcareAllergy;
export const healthcareConsent: typeof dbSchema.healthcareConsent = dbSchema.healthcareConsent;
export const healthcareFlag: typeof dbSchema.healthcareFlag = dbSchema.healthcareFlag;
export const healthcareMergeRequest: typeof dbSchema.healthcareMergeRequest =
  dbSchema.healthcareMergeRequest;
export const healthcareCommunication: typeof dbSchema.healthcareCommunication =
  dbSchema.healthcareCommunication;
export const healthcareRecall: typeof dbSchema.healthcareRecall = dbSchema.healthcareRecall;
export const healthcareShareSlip: typeof dbSchema.healthcareShareSlip =
  dbSchema.healthcareShareSlip;
export type HealthcarePatient = typeof dbSchema.healthcarePatient.$inferSelect;
export type NewHealthcarePatient = typeof dbSchema.healthcarePatient.$inferInsert;
export type HealthcareFamilyLink = typeof dbSchema.healthcareFamilyLink.$inferSelect;
export type NewHealthcareFamilyLink = typeof dbSchema.healthcareFamilyLink.$inferInsert;
export type HealthcareAllergy = typeof dbSchema.healthcareAllergy.$inferSelect;
export type NewHealthcareAllergy = typeof dbSchema.healthcareAllergy.$inferInsert;
export type HealthcareConsent = typeof dbSchema.healthcareConsent.$inferSelect;
export type NewHealthcareConsent = typeof dbSchema.healthcareConsent.$inferInsert;
export type HealthcareFlag = typeof dbSchema.healthcareFlag.$inferSelect;
export type NewHealthcareFlag = typeof dbSchema.healthcareFlag.$inferInsert;
export type HealthcareMergeRequest = typeof dbSchema.healthcareMergeRequest.$inferSelect;
export type NewHealthcareMergeRequest = typeof dbSchema.healthcareMergeRequest.$inferInsert;
export type HealthcareCommunication = typeof dbSchema.healthcareCommunication.$inferSelect;
export type NewHealthcareCommunication = typeof dbSchema.healthcareCommunication.$inferInsert;
export type HealthcareRecall = typeof dbSchema.healthcareRecall.$inferSelect;
export type NewHealthcareRecall = typeof dbSchema.healthcareRecall.$inferInsert;
export type HealthcareShareSlip = typeof dbSchema.healthcareShareSlip.$inferSelect;
export type NewHealthcareShareSlip = typeof dbSchema.healthcareShareSlip.$inferInsert;
