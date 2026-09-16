import type {
  FhirDiagnosticReportView,
  FhirServiceRequestView,
  FhirSpecimenView,
} from "../diagnostics-view";
import type { FhirEncounterView } from "../encounter-view";
import type { FhirObservationView } from "../observation-view";
import type { FhirPatientView } from "../patient-view";

export type DiagnosticReportCompositionStatus = "amended" | "final" | "preliminary";

export interface DiagnosticReportRecordSection {
  code: string;
  display: string;
  entries: string[];
  text: string | null;
  title: string;
}

export interface DiagnosticReportComposition {
  author: string | null;
  date: string;
  encounter: string | null;
  id: string;
  resourceType: "Composition";
  sections: DiagnosticReportRecordSection[];
  status: DiagnosticReportCompositionStatus;
  subject: string;
  title: string;
  type: string;
}

export interface DiagnosticLabGroup {
  observations: FhirObservationView[];
  report: FhirDiagnosticReportView;
  serviceRequest: FhirServiceRequestView | null;
  specimens: FhirSpecimenView[];
}

export interface DiagnosticImagingGroup {
  report: FhirDiagnosticReportView;
}

export type DiagnosticReportRecordEntry =
  | FhirDiagnosticReportView
  | FhirEncounterView
  | FhirObservationView
  | FhirPatientView
  | FhirServiceRequestView
  | FhirSpecimenView;

export interface DiagnosticReportRecordInput {
  encounter: FhirEncounterView | null;
  imaging: DiagnosticImagingGroup[];
  lab: DiagnosticLabGroup[];
  patient: FhirPatientView;
}

export interface DiagnosticReportRecord {
  composition: DiagnosticReportComposition;
  entries: DiagnosticReportRecordEntry[];
}

function compositionStatus(
  lab: DiagnosticLabGroup[],
  imaging: DiagnosticImagingGroup[],
): DiagnosticReportCompositionStatus {
  const reports = [...lab.map((group) => group.report), ...imaging.map((group) => group.report)];
  if (reports.length === 0) {
    return "preliminary";
  }
  const finalized = reports.filter(
    (report) => report.status === "final" || report.status === "amended",
  );
  if (finalized.length === reports.length) {
    const amended = reports.filter((report) => report.status === "amended");
    return amended.length > 0 ? "amended" : "final";
  }
  return "preliminary";
}

export function buildDiagnosticReportRecord(
  input: DiagnosticReportRecordInput,
): DiagnosticReportRecord {
  const labEntries: DiagnosticReportRecordEntry[] = [];
  const labRefs: string[] = [];
  for (const group of input.lab) {
    if (group.serviceRequest !== null) {
      labEntries.push(group.serviceRequest);
      labRefs.push(`ServiceRequest/${group.serviceRequest.id}`);
    }
    for (const specimen of group.specimens) {
      labEntries.push(specimen);
      labRefs.push(`Specimen/${specimen.id}`);
    }
    labEntries.push(group.report);
    labRefs.push(`DiagnosticReport/${group.report.id}`);
    for (const observation of group.observations) {
      labEntries.push(observation);
      labRefs.push(`Observation/${observation.id}`);
    }
  }

  const imagingEntries: DiagnosticReportRecordEntry[] = [];
  const imagingRefs: string[] = [];
  for (const group of input.imaging) {
    imagingEntries.push(group.report);
    imagingRefs.push(`DiagnosticReport/${group.report.id}`);
  }

  const [firstLab] = input.lab;
  const date =
    input.encounter?.period.start ??
    firstLab?.report.effectiveDateTime ??
    input.imaging[0]?.report.effectiveDateTime ??
    null;
  const composition: DiagnosticReportComposition = {
    author: null,
    date: date ?? "",
    encounter: input.encounter === null ? null : `Encounter/${input.encounter.id}`,
    id:
      input.encounter === null
        ? `composition-${input.patient.id}-diagnostic-report`
        : `composition-${input.encounter.id}-diagnostic-report`,
    resourceType: "Composition",
    sections: [
      {
        code: "laboratory",
        display: "Laboratory",
        entries: labRefs,
        text: null,
        title: "Laboratory",
      },
      {
        code: "imaging",
        display: "Imaging",
        entries: imagingRefs,
        text: null,
        title: "Imaging",
      },
    ],
    status: compositionStatus(input.lab, input.imaging),
    subject: `Patient/${input.patient.id}`,
    title: "Diagnostic report record",
    type: "DiagnosticReportRecord",
  };
  const head: DiagnosticReportRecordEntry[] =
    input.encounter === null ? [input.patient] : [input.patient, input.encounter];
  return {
    composition,
    entries: [...head, ...labEntries, ...imagingEntries],
  };
}
