// Table shims: storage is owned by the `@aspen-os/healthcare` core
// kernel (single writer, no migration). This module re-exports the same
// references so its workflows keep local `#/db-schemas/*` imports.
import { dbSchema } from "@aspen-os/healthcare";

export const healthcareObservation: typeof dbSchema.healthcareObservation =
  dbSchema.healthcareObservation;
export type HealthcareObservation = typeof dbSchema.healthcareObservation.$inferSelect;
export type NewHealthcareObservation = typeof dbSchema.healthcareObservation.$inferInsert;
