// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareLabTest: typeof dbSchema.healthcareLabTest = dbSchema.healthcareLabTest;
export const healthcareLabPanel: typeof dbSchema.healthcareLabPanel = dbSchema.healthcareLabPanel;
export const healthcareLabOrder: typeof dbSchema.healthcareLabOrder = dbSchema.healthcareLabOrder;
export const healthcareLabSample: typeof dbSchema.healthcareLabSample =
  dbSchema.healthcareLabSample;
export const healthcareLabResult: typeof dbSchema.healthcareLabResult =
  dbSchema.healthcareLabResult;
export const healthcareRadioBooking: typeof dbSchema.healthcareRadioBooking =
  dbSchema.healthcareRadioBooking;
export const healthcareRadioReport: typeof dbSchema.healthcareRadioReport =
  dbSchema.healthcareRadioReport;
export const healthcareQcLog: typeof dbSchema.healthcareQcLog = dbSchema.healthcareQcLog;
export type HealthcareLabTest = typeof dbSchema.healthcareLabTest.$inferSelect;
export type NewHealthcareLabTest = typeof dbSchema.healthcareLabTest.$inferInsert;
export type HealthcareLabPanel = typeof dbSchema.healthcareLabPanel.$inferSelect;
export type NewHealthcareLabPanel = typeof dbSchema.healthcareLabPanel.$inferInsert;
export type HealthcareLabOrder = typeof dbSchema.healthcareLabOrder.$inferSelect;
export type NewHealthcareLabOrder = typeof dbSchema.healthcareLabOrder.$inferInsert;
export type HealthcareLabSample = typeof dbSchema.healthcareLabSample.$inferSelect;
export type NewHealthcareLabSample = typeof dbSchema.healthcareLabSample.$inferInsert;
export type HealthcareLabResult = typeof dbSchema.healthcareLabResult.$inferSelect;
export type NewHealthcareLabResult = typeof dbSchema.healthcareLabResult.$inferInsert;
export type HealthcareRadioBooking = typeof dbSchema.healthcareRadioBooking.$inferSelect;
export type NewHealthcareRadioBooking = typeof dbSchema.healthcareRadioBooking.$inferInsert;
export type HealthcareRadioReport = typeof dbSchema.healthcareRadioReport.$inferSelect;
export type NewHealthcareRadioReport = typeof dbSchema.healthcareRadioReport.$inferInsert;
export type HealthcareQcLog = typeof dbSchema.healthcareQcLog.$inferSelect;
export type NewHealthcareQcLog = typeof dbSchema.healthcareQcLog.$inferInsert;
