// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareInvoice: typeof dbSchema.healthcareInvoice = dbSchema.healthcareInvoice;
export const healthcareReceipt: typeof dbSchema.healthcareReceipt = dbSchema.healthcareReceipt;
export const healthcarePackageBalance: typeof dbSchema.healthcarePackageBalance =
  dbSchema.healthcarePackageBalance;
export const healthcarePricelist: typeof dbSchema.healthcarePricelist =
  dbSchema.healthcarePricelist;
export const healthcareCreditDebitNote: typeof dbSchema.healthcareCreditDebitNote =
  dbSchema.healthcareCreditDebitNote;
export const healthcareAdvance: typeof dbSchema.healthcareAdvance = dbSchema.healthcareAdvance;
export type HealthcareInvoice = typeof dbSchema.healthcareInvoice.$inferSelect;
export type NewHealthcareInvoice = typeof dbSchema.healthcareInvoice.$inferInsert;
export type HealthcareReceipt = typeof dbSchema.healthcareReceipt.$inferSelect;
export type NewHealthcareReceipt = typeof dbSchema.healthcareReceipt.$inferInsert;
export type HealthcarePackageBalance = typeof dbSchema.healthcarePackageBalance.$inferSelect;
export type NewHealthcarePackageBalance = typeof dbSchema.healthcarePackageBalance.$inferInsert;
export type HealthcarePricelist = typeof dbSchema.healthcarePricelist.$inferSelect;
export type NewHealthcarePricelist = typeof dbSchema.healthcarePricelist.$inferInsert;
export type HealthcareCreditDebitNote = typeof dbSchema.healthcareCreditDebitNote.$inferSelect;
export type NewHealthcareCreditDebitNote = typeof dbSchema.healthcareCreditDebitNote.$inferInsert;
export type HealthcareAdvance = typeof dbSchema.healthcareAdvance.$inferSelect;
export type NewHealthcareAdvance = typeof dbSchema.healthcareAdvance.$inferInsert;
