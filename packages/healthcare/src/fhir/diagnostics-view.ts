import type {
  HealthcareLabOrder,
  HealthcareLabSample,
  HealthcareRadioBooking,
  HealthcareRadioReport,
} from "#/db-schemas/diagnostics";
import type { HealthcareObservation } from "#/db-schemas/observation";

import type { FhirExtensionInput } from "./fhir-extension";
import { SERVICEREQ_INTENT, SERVICEREQ_STATUS_MAP, SPECIMEN_STATUS_MAP } from "./registries";
import type { ServicereqStatusCanonical, SpecimenStatusCanonical } from "./registries";

export type FhirDiagnosticReportStatus =
  | "amended"
  | "cancelled"
  | "corrected"
  | "entered-in-error"
  | "final"
  | "partial"
  | "preliminary"
  | "registered";

export interface FhirServiceRequestView {
  encounter: string | null;
  extension: FhirExtensionInput[];
  id: string;
  identifier: string;
  intent: string;
  occurrence: string;
  priority: string;
  resourceType: "ServiceRequest";
  status: ServicereqStatusCanonical;
  subject: string;
}

export interface FhirSpecimenView {
  accessionIdentifier: string;
  collectedAt: string | null;
  collector: string | null;
  extension: FhirExtensionInput[];
  id: string;
  receivedAt: string | null;
  request: string;
  resourceType: "Specimen";
  status: SpecimenStatusCanonical;
}

export interface FhirDiagnosticReportView {
  category: string;
  code: string;
  conclusion: string | null;
  effectiveDateTime: string;
  encounter: string | null;
  extension: FhirExtensionInput[];
  id: string;
  identifier: string;
  issued: string;
  media: string[];
  performer: string | null;
  resourceType: "DiagnosticReport";
  result: string[];
  specimen: string[];
  status: FhirDiagnosticReportStatus;
  subject: string;
}

const LAB_SERVICE_REQUEST_STATUS = {
  authorized: SERVICEREQ_STATUS_MAP.COMPLETED,
  billed: SERVICEREQ_STATUS_MAP.COMPLETED,
  cancelled: SERVICEREQ_STATUS_MAP.CANCELLED,
  collected: SERVICEREQ_STATUS_MAP.ORDERED,
  confirmed: SERVICEREQ_STATUS_MAP.ORDERED,
  delivered: SERVICEREQ_STATUS_MAP.DELIVERED,
  ordered: SERVICEREQ_STATUS_MAP.ORDERED,
  paid: SERVICEREQ_STATUS_MAP.ORDERED,
  processing: SERVICEREQ_STATUS_MAP.ORDERED,
  received: SERVICEREQ_STATUS_MAP.ORDERED,
  resulted: SERVICEREQ_STATUS_MAP.REPORTED,
} as const;

const RADIO_REPORT_STATUS = {
  authorized: "final",
  booked: "registered",
  cancelled: "cancelled",
  "checked-in": "registered",
  performed: "partial",
  reported: "preliminary",
  rescheduled: "registered",
} as const;

function mapLabPriority(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "stat") {
    return "stat";
  }
  if (normalized === "urgent") {
    return "urgent";
  }
  if (normalized === "asap") {
    return "asap";
  }
  return "routine";
}

function mapSpecimenStatus(raw: string): SpecimenStatusCanonical {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "collected") {
    return SPECIMEN_STATUS_MAP.COLLECTED;
  }
  if (normalized === "received") {
    return SPECIMEN_STATUS_MAP.RECEIVED;
  }
  if (normalized === "accepted") {
    return SPECIMEN_STATUS_MAP.ACCEPTED;
  }
  if (normalized === "rejected") {
    return SPECIMEN_STATUS_MAP.REJECTED;
  }
  if (normalized === "unavailable") {
    return SPECIMEN_STATUS_MAP.UNAVAILABLE;
  }
  if (normalized === "unsatisfactory") {
    return SPECIMEN_STATUS_MAP.UNSATISFACTORY;
  }
  if (normalized === "entered-in-error") {
    return SPECIMEN_STATUS_MAP.ENTERED_IN_ERROR;
  }
  return SPECIMEN_STATUS_MAP.PENDING;
}

function labReportStatus(
  order: HealthcareLabOrder,
  resultCount: number,
): FhirDiagnosticReportStatus {
  if (order.status === "cancelled") {
    return "cancelled";
  }
  if (order.status === "authorized" || order.status === "delivered" || order.status === "billed") {
    return "final";
  }
  if (order.status === "resulted") {
    return "preliminary";
  }
  return resultCount > 0 ? "partial" : "registered";
}

export function toFhirServiceRequestView(order: HealthcareLabOrder): FhirServiceRequestView {
  return {
    encounter: order.encounter_id === null ? null : `Encounter/${order.encounter_id}`,
    extension: [],
    id: order.id,
    identifier: order.order_no,
    intent: SERVICEREQ_INTENT,
    occurrence: order.created_at.toISOString(),
    priority: mapLabPriority(order.priority),
    resourceType: "ServiceRequest",
    status: LAB_SERVICE_REQUEST_STATUS[order.status],
    subject: `Patient/${order.patient_id}`,
  };
}

export function toFhirSpecimenView(sample: HealthcareLabSample): FhirSpecimenView {
  return {
    accessionIdentifier: sample.barcode,
    collectedAt: sample.collected_at?.toISOString() ?? null,
    collector: sample.collected_by,
    extension: [],
    id: sample.id,
    receivedAt: sample.received_at?.toISOString() ?? null,
    request: `ServiceRequest/${sample.order_id}`,
    resourceType: "Specimen",
    status: mapSpecimenStatus(sample.status),
  };
}

export function toFhirDiagnosticReportLab(
  order: HealthcareLabOrder,
  samples: HealthcareLabSample[],
  results: HealthcareObservation[],
): FhirDiagnosticReportView {
  return {
    category: "laboratory",
    code: order.order_no,
    conclusion: order.dx,
    effectiveDateTime: order.created_at.toISOString(),
    encounter: order.encounter_id === null ? null : `Encounter/${order.encounter_id}`,
    extension:
      order.payer === null ? [] : [{ url: "urn:aspen-os:payer", valueString: order.payer }],
    id: order.id,
    identifier: order.order_no,
    issued: order.updated_at.toISOString(),
    media: [],
    performer: null,
    resourceType: "DiagnosticReport",
    result: results.map((result) => `Observation/${result.id}`),
    specimen: samples.map((sample) => `Specimen/${sample.id}`),
    status: labReportStatus(order, results.length),
    subject: `Patient/${order.patient_id}`,
  };
}

export function toFhirDiagnosticReportImaging(
  booking: HealthcareRadioBooking,
  report: HealthcareRadioReport | null,
): FhirDiagnosticReportView {
  return {
    category: "imaging",
    code: booking.service,
    conclusion: report?.impression ?? null,
    effectiveDateTime: booking.created_at.toISOString(),
    encounter: null,
    extension: [],
    id: booking.id,
    identifier: booking.booking_no,
    issued: report?.updated_at.toISOString() ?? booking.updated_at.toISOString(),
    media: report === null ? [] : [report.dms_file_id],
    performer: report?.authorized_by ?? booking.referred_by,
    resourceType: "DiagnosticReport",
    result: [],
    specimen: [],
    status: RADIO_REPORT_STATUS[booking.status],
    subject: `Patient/${booking.patient_id}`,
  };
}
