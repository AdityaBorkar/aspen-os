import type { InferOutput } from "valibot";
import { array, minLength, object, optional, pipe, string } from "valibot";

export const FhirCodingSchema = object({
  code: pipe(string(), minLength(1, "Coding code is required")),
  display: optional(string()),
  system: optional(string()),
});

export const FhirCodeableConceptSchema = object({
  coding: optional(array(FhirCodingSchema)),
  text: optional(string()),
});

export const FhirExtensionSchema = object({
  url: pipe(string(), minLength(1, "Extension URL is required")),
  valueCodeableConcept: optional(FhirCodeableConceptSchema),
  valueString: optional(string()),
});

export type FhirCodingInput = InferOutput<typeof FhirCodingSchema>;
export type FhirCodeableConceptInput = InferOutput<typeof FhirCodeableConceptSchema>;
export type FhirExtensionInput = InferOutput<typeof FhirExtensionSchema>;
