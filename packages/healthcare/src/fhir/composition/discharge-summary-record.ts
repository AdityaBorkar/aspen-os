import type { HealthcareDischargeSummary } from "#/db-schemas/records";

import type { FhirConditionView } from "../condition-view";
import type { FhirEncounterView } from "../encounter-view";
import type { FhirMedicationRequestView } from "../medication-view";
import type { FhirObservationView } from "../observation-view";
import type { FhirPatientView } from "../patient-view";

export type DischargeCompositionStatus = "amended" | "final" | "preliminary";

export interface DischargeSummaryRecordSection {
  code: string;
  display: string;
  entries: string[];
  text: string | null;
  title: string;
}

export interface DischargeSummaryComposition {
  author: string | null;
  date: string;
  dischargeId: string;
  encounter: string;
  id: string;
  issuedAt: string;
  issuedBy: string | null;
  resourceType: "Composition";
  sections: DischargeSummaryRecordSection[];
  status: DischargeCompositionStatus;
  subject: string;
  summary: string;
  title: string;
  type: string;
}

export type DischargeSummaryRecordEntry =
  | FhirConditionView
  | FhirEncounterView
  | FhirMedicationRequestView
  | FhirObservationView
  | FhirPatientView;

export interface DischargeSummaryRecordInput {
  conditions: FhirConditionView[];
  discharge: HealthcareDischargeSummary;
  encounter: FhirEncounterView;
  medRequests: FhirMedicationRequestView[];
  observations: FhirObservationView[];
  patient: FhirPatientView;
}

export interface DischargeSummaryRecord {
  composition: DischargeSummaryComposition;
  entries: DischargeSummaryRecordEntry[];
}

export function buildDischargeSummaryRecord(
  input: DischargeSummaryRecordInput,
): DischargeSummaryRecord {
  const [participant] = input.encounter.participant;
  const composition: DischargeSummaryComposition = {
    author: participant === undefined ? null : participant.individual,
    date: input.encounter.period.start,
    dischargeId: input.discharge.id,
    encounter: `Encounter/${input.encounter.id}`,
    id: `composition-${input.encounter.id}-discharge`,
    issuedAt: input.discharge.issued_at.toISOString(),
    issuedBy: input.discharge.issued_by,
    resourceType: "Composition",
    sections: [
      {
        code: "discharge-summary",
        display: "Discharge summary",
        entries: [],
        text: input.discharge.summary,
        title: "Discharge summary",
      },
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
    ],
    status: "final",
    subject: `Patient/${input.patient.id}`,
    summary: input.discharge.summary,
    title: "Discharge summary record",
    type: "DischargeSummaryRecord",
  };
  return {
    composition,
    entries: [
      input.patient,
      input.encounter,
      ...input.conditions,
      ...input.observations,
      ...input.medRequests,
    ],
  };
}
