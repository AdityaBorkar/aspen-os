import type { FhirDocumentReferenceView } from "../document-view";
import type { FhirEncounterView } from "../encounter-view";
import type { FhirPatientView } from "../patient-view";

export type HealthDocumentCompositionStatus = "amended" | "final" | "preliminary";

export interface HealthDocumentRecordSection {
  code: string;
  display: string;
  entries: string[];
  text: string | null;
  title: string;
}

export interface HealthDocumentComposition {
  author: string | null;
  date: string;
  encounter: string | null;
  id: string;
  resourceType: "Composition";
  sections: HealthDocumentRecordSection[];
  status: HealthDocumentCompositionStatus;
  subject: string;
  title: string;
  type: string;
}

export type HealthDocumentRecordEntry =
  | FhirDocumentReferenceView
  | FhirEncounterView
  | FhirPatientView;

export interface HealthDocumentRecordInput {
  date: string;
  documents: FhirDocumentReferenceView[];
  encounter: FhirEncounterView | null;
  patient: FhirPatientView;
}

export interface HealthDocumentRecord {
  composition: HealthDocumentComposition;
  entries: HealthDocumentRecordEntry[];
}

export function buildHealthDocumentRecord(input: HealthDocumentRecordInput): HealthDocumentRecord {
  const composition: HealthDocumentComposition = {
    author: null,
    date: input.encounter?.period.start ?? input.date,
    encounter: input.encounter === null ? null : `Encounter/${input.encounter.id}`,
    id: `composition-${input.patient.id}-health-document`,
    resourceType: "Composition",
    sections: [
      {
        code: "documents",
        display: "Documents",
        entries: input.documents.map((document) => `DocumentReference/${document.id}`),
        text: null,
        title: "Documents",
      },
    ],
    status: "final",
    subject: `Patient/${input.patient.id}`,
    title: "Health document record",
    type: "HealthDocumentRecord",
  };
  const head: HealthDocumentRecordEntry[] =
    input.encounter === null ? [input.patient] : [input.patient, input.encounter];
  return {
    composition,
    entries: [...head, ...input.documents],
  };
}
