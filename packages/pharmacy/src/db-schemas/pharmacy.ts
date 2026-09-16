// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcarePharmacyItem: typeof dbSchema.healthcarePharmacyItem =
  dbSchema.healthcarePharmacyItem;
export const healthcarePharmacyBatch: typeof dbSchema.healthcarePharmacyBatch =
  dbSchema.healthcarePharmacyBatch;
export const healthcarePharmacySale: typeof dbSchema.healthcarePharmacySale =
  dbSchema.healthcarePharmacySale;
export const healthcarePharmacyReturn: typeof dbSchema.healthcarePharmacyReturn =
  dbSchema.healthcarePharmacyReturn;
export const healthcarePurchaseOrder: typeof dbSchema.healthcarePurchaseOrder =
  dbSchema.healthcarePurchaseOrder;
export const healthcareGrn: typeof dbSchema.healthcareGrn = dbSchema.healthcareGrn;
export const healthcarePurchaseInvoice: typeof dbSchema.healthcarePurchaseInvoice =
  dbSchema.healthcarePurchaseInvoice;
export const healthcareStockTransfer: typeof dbSchema.healthcareStockTransfer =
  dbSchema.healthcareStockTransfer;
export type HealthcarePharmacyItem = typeof dbSchema.healthcarePharmacyItem.$inferSelect;
export type NewHealthcarePharmacyItem = typeof dbSchema.healthcarePharmacyItem.$inferInsert;
export type HealthcarePharmacyBatch = typeof dbSchema.healthcarePharmacyBatch.$inferSelect;
export type NewHealthcarePharmacyBatch = typeof dbSchema.healthcarePharmacyBatch.$inferInsert;
export type HealthcarePharmacySale = typeof dbSchema.healthcarePharmacySale.$inferSelect;
export type NewHealthcarePharmacySale = typeof dbSchema.healthcarePharmacySale.$inferInsert;
export type HealthcarePharmacyReturn = typeof dbSchema.healthcarePharmacyReturn.$inferSelect;
export type NewHealthcarePharmacyReturn = typeof dbSchema.healthcarePharmacyReturn.$inferInsert;
export type HealthcarePurchaseOrder = typeof dbSchema.healthcarePurchaseOrder.$inferSelect;
export type NewHealthcarePurchaseOrder = typeof dbSchema.healthcarePurchaseOrder.$inferInsert;
export type HealthcareGrn = typeof dbSchema.healthcareGrn.$inferSelect;
export type NewHealthcareGrn = typeof dbSchema.healthcareGrn.$inferInsert;
export type HealthcarePurchaseInvoice = typeof dbSchema.healthcarePurchaseInvoice.$inferSelect;
export type NewHealthcarePurchaseInvoice = typeof dbSchema.healthcarePurchaseInvoice.$inferInsert;
export type HealthcareStockTransfer = typeof dbSchema.healthcareStockTransfer.$inferSelect;
export type NewHealthcareStockTransfer = typeof dbSchema.healthcareStockTransfer.$inferInsert;
