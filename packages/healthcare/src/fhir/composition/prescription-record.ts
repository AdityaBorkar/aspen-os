import type { FhirEncounterView } from "../encounter-view";
import type { FhirMedicationRequestView } from "../medication-view";
import type { FhirPatientView } from "../patient-view";

export type PrescriptionCompositionStatus = "amended" | "final" | "preliminary";

export interface PrescriptionRecordSection {
  code: string;
  display: string;
  entries: string[];
  text: string | null;
  title: string;
}

export interface PrescriptionComposition {
  author: string | null;
  date: string;
  encounter: string;
  id: string;
  resourceType: "Composition";
  sections: PrescriptionRecordSection[];
  status: PrescriptionCompositionStatus;
  subject: string;
  title: string;
  type: string;
}

export type PrescriptionRecordEntry =
  | FhirEncounterView
  | FhirMedicationRequestView
  | FhirPatientView;

export interface PrescriptionRecordInput {
  encounter: FhirEncounterView;
  medRequests: FhirMedicationRequestView[];
  patient: FhirPatientView;
}

export interface PrescriptionRecord {
  composition: PrescriptionComposition;
  entries: PrescriptionRecordEntry[];
}

function compositionStatus(encounter: FhirEncounterView): PrescriptionCompositionStatus {
  if (encounter.status === "finished") {
    return "final";
  }
  return "preliminary";
}

export function buildPrescriptionRecord(input: PrescriptionRecordInput): PrescriptionRecord {
  const [participant] = input.encounter.participant;
  const composition: PrescriptionComposition = {
    author: participant === undefined ? null : participant.individual,
    date: input.encounter.period.start,
    encounter: `Encounter/${input.encounter.id}`,
    id: `composition-${input.encounter.id}-prescription`,
    resourceType: "Composition",
    sections: [
      {
        code: "medications",
        display: "Medications",
        entries: input.medRequests.map((request) => `MedicationRequest/${request.id}`),
        text: null,
        title: "Medications",
      },
    ],
    status: compositionStatus(input.encounter),
    subject: `Patient/${input.patient.id}`,
    title: "Prescription record",
    type: "PrescriptionRecord",
  };
  return {
    composition,
    entries: [input.patient, input.encounter, ...input.medRequests],
  };
}
