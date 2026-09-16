// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareCounter: typeof dbSchema.healthcareCounter = dbSchema.healthcareCounter;
export type HealthcareCounter = typeof dbSchema.healthcareCounter.$inferSelect;
export type NewHealthcareCounter = typeof dbSchema.healthcareCounter.$inferInsert;
