// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareCondition: typeof dbSchema.healthcareCondition =
  dbSchema.healthcareCondition;
export type HealthcareCondition = typeof dbSchema.healthcareCondition.$inferSelect;
export type NewHealthcareCondition = typeof dbSchema.healthcareCondition.$inferInsert;
