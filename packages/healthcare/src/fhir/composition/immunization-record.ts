import type { HealthcareImmunization } from "#/db-schemas/allopathy";

import type { FhirEncounterView } from "../encounter-view";
import type { FhirPatientView } from "../patient-view";

export type ImmunizationCompositionStatus = "amended" | "final" | "preliminary";

export interface ImmunizationRecordSection {
  code: string;
  display: string;
  entries: string[];
  text: string | null;
  title: string;
}

export interface ImmunizationComposition {
  author: string | null;
  date: string;
  encounter: string | null;
  id: string;
  resourceType: "Composition";
  sections: ImmunizationRecordSection[];
  status: ImmunizationCompositionStatus;
  subject: string;
  title: string;
  type: string;
}

export interface FhirImmunizationEntry {
  doseNo: number;
  dueDate: string | null;
  givenAt: string | null;
  id: string;
  resourceType: "Immunization";
  status: string;
  subject: string;
  vaccine: string;
}

export type ImmunizationRecordEntry = FhirEncounterView | FhirImmunizationEntry | FhirPatientView;

export interface ImmunizationRecordInput {
  date: string;
  encounter: FhirEncounterView | null;
  immunizations: HealthcareImmunization[];
  patient: FhirPatientView;
}

export interface ImmunizationRecord {
  composition: ImmunizationComposition;
  entries: ImmunizationRecordEntry[];
}

function toImmunizationEntry(
  row: HealthcareImmunization,
  patientId: string,
): FhirImmunizationEntry {
  return {
    doseNo: row.dose_no,
    dueDate: row.due_date,
    givenAt: row.given_at,
    id: row.id,
    resourceType: "Immunization",
    status: row.status,
    subject: `Patient/${patientId}`,
    vaccine: row.vaccine,
  };
}

export function buildImmunizationRecord(input: ImmunizationRecordInput): ImmunizationRecord {
  const immunizationEntries = input.immunizations.map((row) =>
    toImmunizationEntry(row, input.patient.id),
  );
  const composition: ImmunizationComposition = {
    author: null,
    date: input.encounter?.period.start ?? input.date,
    encounter: input.encounter === null ? null : `Encounter/${input.encounter.id}`,
    id: `composition-${input.patient.id}-immunization`,
    resourceType: "Composition",
    sections: [
      {
        code: "immunizations",
        display: "Immunizations",
        entries: immunizationEntries.map((entry) => `Immunization/${entry.id}`),
        text: null,
        title: "Immunizations",
      },
    ],
    status: "final",
    subject: `Patient/${input.patient.id}`,
    title: "Immunization record",
    type: "ImmunizationRecord",
  };
  const head: ImmunizationRecordEntry[] =
    input.encounter === null ? [input.patient] : [input.patient, input.encounter];
  return {
    composition,
    entries: [...head, ...immunizationEntries],
  };
}
