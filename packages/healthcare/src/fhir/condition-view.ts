import type { HealthcareCondition } from "#/db-schemas/condition";

import { is, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

import type { FhirExtensionInput } from "./fhir-extension";
import { CODE_SYSTEM, CONDITION_CLINICAL_MAP, CONDITION_VERIFICATION_MAP } from "./registries";
import type { ConditionClinicalCanonical, ConditionVerificationCanonical } from "./registries";

export interface FhirConditionCoding {
  code: string;
  display: string | null;
  system: string;
}

export interface FhirConditionCode {
  coding: FhirConditionCoding[];
  text: string;
}

export interface FhirConditionView {
  clinicalStatus: ConditionClinicalCanonical;
  code: FhirConditionCode;
  encounter: string | null;
  extension: FhirExtensionInput[];
  id: string;
  onsetDateTime: string | null;
  rank: number | null;
  recordedDate: string;
  recorder: string | null;
  resourceType: "Condition";
  subject: string;
  verificationStatus: ConditionVerificationCanonical;
}

const ConditionCodingSchema = object({
  code: string(),
  display: optional(string()),
  label: optional(string()),
  system: optional(string()),
});

type ConditionCodingEntry = InferOutput<typeof ConditionCodingSchema>;

function resolveCodeSystem(raw: string): string {
  if (raw === "ICD11") {
    return CODE_SYSTEM.ICD11;
  }
  if (raw === "TM2") {
    return CODE_SYSTEM.TM2;
  }
  if (raw === "NAMASTE") {
    return CODE_SYSTEM.NAMASTE;
  }
  if (raw === "LOINC") {
    return CODE_SYSTEM.LOINC;
  }
  if (raw === "SNOMED") {
    return CODE_SYSTEM.SNOMED;
  }
  return CODE_SYSTEM.LOCAL;
}

function mapClinicalStatus(raw: string): ConditionClinicalCanonical {
  const normalized = raw.trim().toLowerCase();
  if (normalized === CONDITION_CLINICAL_MAP.ACTIVE) {
    return CONDITION_CLINICAL_MAP.ACTIVE;
  }
  if (normalized === CONDITION_CLINICAL_MAP.RECURRENCE) {
    return CONDITION_CLINICAL_MAP.RECURRENCE;
  }
  if (normalized === CONDITION_CLINICAL_MAP.RELAPSE) {
    return CONDITION_CLINICAL_MAP.RELAPSE;
  }
  if (normalized === CONDITION_CLINICAL_MAP.INACTIVE) {
    return CONDITION_CLINICAL_MAP.INACTIVE;
  }
  if (normalized === CONDITION_CLINICAL_MAP.REMISSION) {
    return CONDITION_CLINICAL_MAP.REMISSION;
  }
  if (normalized === CONDITION_CLINICAL_MAP.RESOLVED) {
    return CONDITION_CLINICAL_MAP.RESOLVED;
  }
  return CONDITION_CLINICAL_MAP.ACTIVE;
}

function mapVerificationStatus(raw: string): ConditionVerificationCanonical {
  const normalized = raw.trim().toLowerCase();
  if (normalized === CONDITION_VERIFICATION_MAP.UNCONFIRMED) {
    return CONDITION_VERIFICATION_MAP.UNCONFIRMED;
  }
  if (normalized === CONDITION_VERIFICATION_MAP.PROVISIONAL) {
    return CONDITION_VERIFICATION_MAP.PROVISIONAL;
  }
  if (normalized === CONDITION_VERIFICATION_MAP.DIFFERENTIAL) {
    return CONDITION_VERIFICATION_MAP.DIFFERENTIAL;
  }
  if (normalized === CONDITION_VERIFICATION_MAP.CONFIRMED) {
    return CONDITION_VERIFICATION_MAP.CONFIRMED;
  }
  if (normalized === CONDITION_VERIFICATION_MAP.REFUTED) {
    return CONDITION_VERIFICATION_MAP.REFUTED;
  }
  if (normalized === CONDITION_VERIFICATION_MAP.ENTERED_IN_ERROR) {
    return CONDITION_VERIFICATION_MAP.ENTERED_IN_ERROR;
  }
  return CONDITION_VERIFICATION_MAP.UNCONFIRMED;
}

function asCoding(entry: ConditionCodingEntry): FhirConditionCoding {
  return {
    code: entry.code,
    display: entry.display ?? entry.label ?? null,
    system: entry.system === undefined ? CODE_SYSTEM.LOCAL : resolveCodeSystem(entry.system),
  };
}

export function toFhirConditionView(row: HealthcareCondition): FhirConditionView {
  const clinicalStatus = mapClinicalStatus(row.clinical_status);
  const verificationStatus = mapVerificationStatus(row.verification_status);

  const extension: FhirExtensionInput[] = [];
  if (row.clinical_status.trim().toLowerCase() !== clinicalStatus) {
    extension.push({ url: "urn:aspen-os:legacy-status", valueString: row.clinical_status });
  }
  if (row.verification_status.trim().toLowerCase() !== verificationStatus) {
    extension.push({
      url: "urn:aspen-os:legacy-verification",
      valueString: row.verification_status,
    });
  }

  const coding: FhirConditionCoding[] = [
    { code: row.code, display: row.label, system: resolveCodeSystem(row.code_system) },
  ];
  const extra = Array.isArray(row.codings) ? row.codings : [];
  for (const entry of extra) {
    if (is(ConditionCodingSchema, entry)) {
      coding.push(asCoding(entry));
    }
  }

  return {
    clinicalStatus,
    code: { coding, text: row.label },
    encounter: row.encounter_id === null ? null : `Encounter/${row.encounter_id}`,
    extension,
    id: row.id,
    onsetDateTime: row.onset_at?.toISOString() ?? null,
    rank: row.rank,
    recordedDate: row.recorded_at.toISOString(),
    recorder: row.recorded_by === null ? null : `Practitioner/${row.recorded_by}`,
    resourceType: "Condition",
    subject: `Patient/${row.patient_id}`,
    verificationStatus,
  };
}
