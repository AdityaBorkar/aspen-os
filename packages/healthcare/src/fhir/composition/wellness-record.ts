import type { FhirConditionView } from "../condition-view";
import type { FhirEncounterView } from "../encounter-view";
import type { FhirObservationView } from "../observation-view";
import type { FhirPatientView } from "../patient-view";

export type WellnessCompositionStatus = "amended" | "final" | "preliminary";

export interface WellnessRecordSection {
  code: string;
  display: string;
  entries: string[];
  text: string | null;
  title: string;
}

export interface WellnessComposition {
  author: string | null;
  date: string;
  encounter: string | null;
  id: string;
  resourceType: "Composition";
  sections: WellnessRecordSection[];
  status: WellnessCompositionStatus;
  subject: string;
  title: string;
  type: string;
}

export type WellnessRecordEntry =
  | FhirConditionView
  | FhirEncounterView
  | FhirObservationView
  | FhirPatientView;

export interface WellnessRecordInput {
  conditions: FhirConditionView[];
  date: string;
  encounter: FhirEncounterView | null;
  observations: FhirObservationView[];
  patient: FhirPatientView;
}

export interface WellnessRecord {
  composition: WellnessComposition;
  entries: WellnessRecordEntry[];
}

export function buildWellnessRecord(input: WellnessRecordInput): WellnessRecord {
  const [participant] = input.encounter?.participant ?? [];
  const composition: WellnessComposition = {
    author: participant === undefined ? null : participant.individual,
    date: input.encounter?.period.start ?? input.date,
    encounter: input.encounter === null ? null : `Encounter/${input.encounter.id}`,
    id: `composition-${input.patient.id}-wellness`,
    resourceType: "Composition",
    sections: [
      {
        code: "observations",
        display: "Observations",
        entries: input.observations.map((observation) => `Observation/${observation.id}`),
        text: null,
        title: "Observations",
      },
      {
        code: "problems",
        display: "Problems",
        entries: input.conditions.map((condition) => `Condition/${condition.id}`),
        text: null,
        title: "Problems",
      },
    ],
    status: "final",
    subject: `Patient/${input.patient.id}`,
    title: "Wellness record",
    type: "WellnessRecord",
  };
  const head: WellnessRecordEntry[] =
    input.encounter === null ? [input.patient] : [input.patient, input.encounter];
  return {
    composition,
    entries: [...head, ...input.observations, ...input.conditions],
  };
}
