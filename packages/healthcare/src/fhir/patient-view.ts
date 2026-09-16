import type { HealthcarePatient } from "#/db-schemas/patient";

import type { FhirExtensionInput } from "./fhir-extension";
import { ADMIN_GENDER_MAP, IDENTIFIER_SYSTEM } from "./registries";
import type { AdminGenderCanonical } from "./registries";

export interface FhirPatientIdentifier {
  assigner: string | null;
  system: string;
  value: string;
}

export interface FhirPatientName {
  family: string | null;
  given: string[];
  text: string;
}

export interface FhirPatientTelecom {
  system: "phone";
  use: "mobile";
  value: string;
}

export interface FhirPatientLink {
  other: string;
  type: "replace" | "seealso";
}

export interface FhirPatientView {
  active: boolean;
  birthDate: string | null;
  extension: FhirExtensionInput[];
  gender: AdminGenderCanonical;
  id: string;
  identifier: FhirPatientIdentifier[];
  link: FhirPatientLink[];
  name: FhirPatientName[];
  resourceType: "Patient";
  telecom: FhirPatientTelecom[];
}

function mapGender(raw: string | null): AdminGenderCanonical {
  if (raw === null) {
    return ADMIN_GENDER_MAP.UNKNOWN;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "male") {
    return ADMIN_GENDER_MAP.MALE;
  }
  if (normalized === "female") {
    return ADMIN_GENDER_MAP.FEMALE;
  }
  if (normalized === "other") {
    return ADMIN_GENDER_MAP.OTHER;
  }
  return ADMIN_GENDER_MAP.UNKNOWN;
}

function splitName(fullName: string): FhirPatientName {
  const parts = fullName.split(" ").filter((part) => part.length > 0);
  if (parts.length === 0) {
    return { family: null, given: [], text: fullName };
  }
  const last = parts[parts.length - 1];
  if (parts.length === 1 || last === undefined) {
    return { family: null, given: parts, text: fullName };
  }
  return { family: last, given: parts.slice(0, -1), text: fullName };
}

export function toFhirPatientView(row: HealthcarePatient): FhirPatientView {
  const identifier: FhirPatientIdentifier[] = [
    { assigner: row.branch_id, system: IDENTIFIER_SYSTEM.LOCAL, value: row.id },
    { assigner: "facility", system: IDENTIFIER_SYSTEM.UHID, value: row.uhid },
  ];
  if (row.abha !== null) {
    identifier.push({ assigner: "ABDM", system: IDENTIFIER_SYSTEM.ABHA, value: row.abha });
  }

  const extension: FhirExtensionInput[] = [];
  if (row.guardian !== null && row.guardian.length > 0) {
    extension.push({ url: "urn:aspen-os:patient-guardian", valueString: row.guardian });
  }
  if (row.language.length > 0) {
    extension.push({ url: "urn:aspen-os:patient-language", valueString: row.language });
  }
  const gender = mapGender(row.gender);
  if (gender === ADMIN_GENDER_MAP.UNKNOWN && row.gender !== null && row.gender.trim().length > 0) {
    extension.push({ url: "urn:aspen-os:legacy-gender", valueString: row.gender });
  }

  const link: FhirPatientLink[] =
    row.merged_into === null ? [] : [{ other: `Patient/${row.merged_into}`, type: "replace" }];

  return {
    active: row.status === "active",
    birthDate: row.dob,
    extension,
    gender,
    id: row.id,
    identifier,
    link,
    name: [splitName(row.full_name)],
    resourceType: "Patient",
    telecom: [{ system: "phone", use: "mobile", value: row.phone }],
  };
}
