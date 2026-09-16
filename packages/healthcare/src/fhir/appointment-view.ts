import type { HealthcareAppointment } from "#/db-schemas/appointments";

import { is, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

import type { FhirExtensionInput } from "./fhir-extension";
import { APPOINTMENT_STATUS_MAP } from "./registries";
import type { AppointmentStatusCanonical } from "./registries";

export type FhirSlotStatus =
  | "busy"
  | "busy-tentative"
  | "busy-unavailable"
  | "entered-in-error"
  | "free";

export interface FhirAppointmentParticipant {
  actor: string;
  status: "accepted" | "needs-action";
}

export interface FhirAppointmentView {
  description: string | null;
  end: string;
  extension: FhirExtensionInput[];
  id: string;
  location: string | null;
  minutesDuration: number | null;
  participant: FhirAppointmentParticipant[];
  resourceType: "Appointment";
  serviceType: string | null;
  start: string;
  status: AppointmentStatusCanonical;
  subject: string;
}

export interface FhirSlotProjection {
  end: string;
  id: string;
  resourceType: "Slot";
  start: string;
  status: FhirSlotStatus;
}

export interface FhirSlotWindow {
  end: string;
  start: string;
}

const APPOINTMENT_STATUS_VIEW = {
  booked: APPOINTMENT_STATUS_MAP.BOOKED,
  cancelled: APPOINTMENT_STATUS_MAP.CANCELLED,
  "checked-in": APPOINTMENT_STATUS_MAP.CHECKED_IN,
  confirmed: APPOINTMENT_STATUS_MAP.CONFIRMED,
  done: APPOINTMENT_STATUS_MAP.DONE,
  "in-consult": APPOINTMENT_STATUS_MAP.IN_CONSULT,
  "in-queue": APPOINTMENT_STATUS_MAP.IN_QUEUE,
  "no-show": APPOINTMENT_STATUS_MAP.NO_SHOW,
  rescheduled: APPOINTMENT_STATUS_MAP.RESCHEDULED,
} as const;

const SLOT_STATUS_VIEW = {
  booked: "busy",
  cancelled: "free",
  "checked-in": "busy",
  confirmed: "busy",
  done: "busy",
  "in-consult": "busy",
  "in-queue": "busy",
  "no-show": "busy-unavailable",
  rescheduled: "free",
} as const;

const DEFAULT_SLOT_MIN = 15;

const AppointmentFhirOverlaySchema = object({
  rescheduled_to: optional(string()),
});

type AppointmentFhirOverlay = InferOutput<typeof AppointmentFhirOverlaySchema>;

function readOverlay(payload: HealthcareAppointment["payload"]): AppointmentFhirOverlay | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  const raw = payload.fhir;
  if (raw instanceof Date || Array.isArray(raw)) {
    return null;
  }
  return is(AppointmentFhirOverlaySchema, raw) ? raw : null;
}

function slotWindow(slotStart: Date, durationMin: number | null): FhirSlotWindow {
  const minutes = durationMin ?? DEFAULT_SLOT_MIN;
  const start = slotStart.toISOString();
  const end = new Date(slotStart.getTime() + minutes * 60_000).toISOString();
  return { end, start };
}

export function toFhirAppointmentView(row: HealthcareAppointment): FhirAppointmentView {
  const overlay = readOverlay(row.payload);
  const window = slotWindow(row.slot_start, row.duration_min);

  const participant: FhirAppointmentParticipant[] = [
    {
      actor: `Patient/${row.patient_id}`,
      status: row.status === "cancelled" ? "needs-action" : "accepted",
    },
    {
      actor: `Practitioner/${row.practitioner_id}`,
      status: row.status === "cancelled" ? "needs-action" : "accepted",
    },
  ];

  const extension: FhirExtensionInput[] = [
    { url: "urn:aspen-os:appointment-tele", valueString: String(row.tele) },
    { url: "urn:aspen-os:appointment-daycare", valueString: String(row.daycare) },
  ];
  if (overlay?.rescheduled_to !== undefined) {
    extension.push({
      url: "urn:aspen-os:rescheduled-to",
      valueString: overlay.rescheduled_to,
    });
  }

  return {
    description: row.service_id,
    end: window.end,
    extension,
    id: row.id,
    location: row.facility_id === null ? null : `Location/${row.facility_id}`,
    minutesDuration: row.duration_min,
    participant,
    resourceType: "Appointment",
    serviceType: row.service_id,
    start: window.start,
    status: APPOINTMENT_STATUS_VIEW[row.status],
    subject: `Patient/${row.patient_id}`,
  };
}

export function toFhirSlotProjection(row: HealthcareAppointment): FhirSlotProjection {
  const window = slotWindow(row.slot_start, row.duration_min);
  return {
    end: window.end,
    id: row.id,
    resourceType: "Slot",
    start: window.start,
    status: SLOT_STATUS_VIEW[row.status],
  };
}
