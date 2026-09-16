import type { HealthcareEncounter } from "#/db-schemas/encounters";

import { is, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

import type { FhirExtensionInput } from "./fhir-extension";
import { CODE_SYSTEM, ENCOUNTER_STATUS_MAP } from "./registries";
import type { EncounterStatusCanonical } from "./registries";

export interface FhirEncounterKin {
  appointmentId: string | null;
  conditionIds: string[];
  practitionerId: string | null;
}

export interface FhirEncounterClass {
  code: string;
  display: string;
  system: string;
}

export interface FhirEncounterType {
  coding: FhirEncounterClass[];
  text: string;
}

export interface FhirEncounterParticipant {
  individual: string;
  type: string;
}

export interface FhirEncounterDiagnosis {
  condition: string;
  rank: number;
}

export interface FhirEncounterPeriod {
  end: string | null;
  start: string;
}

export interface FhirEncounterView {
  appointment: string | null;
  class: FhirEncounterClass;
  diagnosis: FhirEncounterDiagnosis[];
  extension: FhirExtensionInput[];
  id: string;
  participant: FhirEncounterParticipant[];
  period: FhirEncounterPeriod;
  resourceType: "Encounter";
  status: EncounterStatusCanonical;
  subject: string;
  type: FhirEncounterType[];
}

const ENCOUNTER_STATUS_VIEW = {
  open: ENCOUNTER_STATUS_MAP.OPEN,
  signed: ENCOUNTER_STATUS_MAP.SIGNED,
} as const;

const EncounterFhirOverlaySchema = object({
  status: optional(string()),
});

type EncounterFhirOverlay = InferOutput<typeof EncounterFhirOverlaySchema>;

function readOverlay(payload: HealthcareEncounter["payload"]): EncounterFhirOverlay | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  const raw = payload.fhir;
  if (raw instanceof Date || Array.isArray(raw)) {
    return null;
  }
  return is(EncounterFhirOverlaySchema, raw) ? raw : null;
}

function asCanonicalStatus(value: string): EncounterStatusCanonical | null {
  if (value === ENCOUNTER_STATUS_MAP.PLANNED) {
    return ENCOUNTER_STATUS_MAP.PLANNED;
  }
  if (value === ENCOUNTER_STATUS_MAP.ARRIVED) {
    return ENCOUNTER_STATUS_MAP.ARRIVED;
  }
  if (value === ENCOUNTER_STATUS_MAP.TRIAGED) {
    return ENCOUNTER_STATUS_MAP.TRIAGED;
  }
  if (value === ENCOUNTER_STATUS_MAP.IN_PROGRESS) {
    return ENCOUNTER_STATUS_MAP.IN_PROGRESS;
  }
  if (value === ENCOUNTER_STATUS_MAP.ONLEAVE) {
    return ENCOUNTER_STATUS_MAP.ONLEAVE;
  }
  if (value === ENCOUNTER_STATUS_MAP.FINISHED) {
    return ENCOUNTER_STATUS_MAP.FINISHED;
  }
  if (value === ENCOUNTER_STATUS_MAP.CANCELLED) {
    return ENCOUNTER_STATUS_MAP.CANCELLED;
  }
  return null;
}

function mapStatus(
  row: HealthcareEncounter,
  overlay: EncounterFhirOverlay | null,
): EncounterStatusCanonical {
  if (overlay?.status !== undefined) {
    const canonical = asCanonicalStatus(overlay.status);
    if (canonical !== null) {
      return canonical;
    }
  }
  return ENCOUNTER_STATUS_VIEW[row.status];
}

export function toFhirEncounterView(
  row: HealthcareEncounter,
  kin?: FhirEncounterKin,
): FhirEncounterView {
  const overlay = readOverlay(row.payload);
  const appointmentId = kin?.appointmentId ?? row.appointment_id;
  const practitionerId = kin?.practitionerId ?? null;
  const conditionIds = kin?.conditionIds ?? [];

  const participant: FhirEncounterParticipant[] =
    practitionerId === null ? [] : [{ individual: `Practitioner/${practitionerId}`, type: "PPRF" }];

  return {
    appointment: appointmentId === null ? null : `Appointment/${appointmentId}`,
    class: { code: row.visit_type, display: row.visit_type, system: CODE_SYSTEM.LOCAL },
    diagnosis: conditionIds.map((conditionId, index) => ({
      condition: `Condition/${conditionId}`,
      rank: index + 1,
    })),
    extension: [],
    id: row.id,
    participant,
    period: {
      end: row.status === "signed" ? row.updated_at.toISOString() : null,
      start: row.created_at.toISOString(),
    },
    resourceType: "Encounter",
    status: mapStatus(row, overlay),
    subject: `Patient/${row.patient_id}`,
    type: [
      {
        coding: [{ code: row.specialty, display: row.specialty, system: CODE_SYSTEM.LOCAL }],
        text: row.specialty,
      },
    ],
  };
}
