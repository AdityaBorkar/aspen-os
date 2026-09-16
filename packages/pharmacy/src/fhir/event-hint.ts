// Event enrichment hints (HEALTHCARE-SPEC §15, ACL-owned).
//
// Producers attach an optional `data.fhir` hint built by `toFhirHint()`.
// The hint is additive: old consumers validate with Valibot `object()`,
// which strips unknown keys, so they ignore it; new consumers read
// `resourceType`/`id`/`mapsTo` to jump straight to the FHIR view.
// Topics, call shapes, and audit writes are unchanged.
//
// `NursingOrderMirrorSchema` is the versioned contract for the
// `inpatient.nursing_created` `data.mirrored[]` entries consumed by the
// tasks bridge. `version` defaults to 1 so pre-hint events still validate.
import { literal, minLength, nullish, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const FhirHintSchema = object({
  id: pipe(string(), minLength(1, "FHIR hint id is required")),
  mapsTo: optional(string()),
  resourceType: pipe(string(), minLength(1, "FHIR hint resourceType is required")),
});

export type FhirHintInput = InferOutput<typeof FhirHintSchema>;

export function toFhirHint(resourceType: string, id: string): FhirHintInput {
  return { id, mapsTo: `${resourceType}/${id}`, resourceType };
}

export const NURSING_ORDER_MIRROR_VERSION = 1 as const;

export const NursingOrderMirrorSchema = object({
  dueAt: nullish(string()),
  encounterId: nullish(string()),
  healthcareTaskId: string(),
  kind: nullish(string()),
  orderId: nullish(string()),
  patientId: string(),
  status: optional(string()),
  title: string(),
  version: optional(literal(NURSING_ORDER_MIRROR_VERSION), NURSING_ORDER_MIRROR_VERSION),
});

export type NursingOrderMirrorInput = InferOutput<typeof NursingOrderMirrorSchema>;
