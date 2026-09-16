import type { FhirConditionView } from "../condition-view";
import type { FhirServiceRequestView } from "../diagnostics-view";
import type { FhirEncounterView } from "../encounter-view";
import type { FhirMedicationRequestView } from "../medication-view";
import type { FhirObservationView } from "../observation-view";
import type { FhirPatientView } from "../patient-view";

export type OPConsultCompositionStatus = "amended" | "final" | "preliminary";

export interface OPConsultRecordSection {
  code: string;
  display: string;
  entries: string[];
  text: string | null;
  title: string;
}

export interface OPConsultComposition {
  author: string | null;
  date: string;
  encounter: string;
  id: string;
  resourceType: "Composition";
  sections: OPConsultRecordSection[];
  status: OPConsultCompositionStatus;
  subject: string;
  title: string;
  type: string;
}

export type OPConsultRecordEntry =
  | FhirConditionView
  | FhirEncounterView
  | FhirMedicationRequestView
  | FhirObservationView
  | FhirPatientView
  | FhirServiceRequestView;

export interface OPConsultRecordInput {
  conditions: FhirConditionView[];
  encounter: FhirEncounterView;
  medRequests: FhirMedicationRequestView[];
  observations: FhirObservationView[];
  patient: FhirPatientView;
  serviceRequests: FhirServiceRequestView[];
}

export interface OPConsultRecord {
  composition: OPConsultComposition;
  entries: OPConsultRecordEntry[];
}

function compositionStatus(encounter: FhirEncounterView): OPConsultCompositionStatus {
  if (encounter.status === "finished") {
    return "final";
  }
  return "preliminary";
}

export function buildOPConsultRecord(input: OPConsultRecordInput): OPConsultRecord {
  const [participant] = input.encounter.participant;
  const encounterRef = `Encounter/${input.encounter.id}`;
  const composition: OPConsultComposition = {
    author: participant === undefined ? null : participant.individual,
    date: input.encounter.period.start,
    encounter: encounterRef,
    id: `composition-${input.encounter.id}`,
    resourceType: "Composition",
    sections: [
      {
        code: "diagnoses",
        display: "Diagnoses",
        entries: input.conditions.map((condition) => `Condition/${condition.id}`),
        text: null,
        title: "Diagnoses",
      },
      {
        code: "observations",
        display: "Observations",
        entries: input.observations.map((observation) => `Observation/${observation.id}`),
        text: null,
        title: "Observations",
      },
      {
        code: "medications",
        display: "Medications",
        entries: input.medRequests.map((request) => `MedicationRequest/${request.id}`),
        text: null,
        title: "Medications",
      },
      {
        code: "orders",
        display: "Service requests",
        entries: input.serviceRequests.map((request) => `ServiceRequest/${request.id}`),
        text: null,
        title: "Service requests",
      },
    ],
    status: compositionStatus(input.encounter),
    subject: `Patient/${input.patient.id}`,
    title: "OP consult record",
    type: "OPConsultRecord",
  };
  return {
    composition,
    entries: [
      input.patient,
      input.encounter,
      ...input.conditions,
      ...input.observations,
      ...input.medRequests,
      ...input.serviceRequests,
    ],
  };
}
