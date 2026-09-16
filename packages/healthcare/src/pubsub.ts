import type { JsonValue } from "@aspen-os/platform/server";

export const PATIENT_EVENTS = {
  CREATED: "healthcare.patient_created",
  MERGED: "healthcare.patient_merged",
  UPDATED: "healthcare.patient_updated",
} as const;

export const PRACTITIONER_EVENTS = {
  CREATED: "healthcare.practitioner_created",
  UPDATED: "healthcare.practitioner_updated",
} as const;

export const FACILITY_EVENTS = {
  CREATED: "healthcare.facility_created",
  UPDATED: "healthcare.facility_updated",
} as const;

export const SERVICE_EVENTS = {
  CREATED: "healthcare.service_created",
  REDEEMED: "healthcare.service_redeemed",
  UPDATED: "healthcare.service_updated",
} as const;

export const APPOINTMENT_EVENTS = {
  CREATED: "healthcare.appointment_created",
  UPDATED: "healthcare.appointment_updated",
} as const;

export const ENCOUNTER_EVENTS = {
  CREATED: "healthcare.encounter_created",
  SIGNED: "healthcare.encounter_signed",
  UPDATED: "healthcare.encounter_updated",
} as const;

export const BILLING_EVENTS = {
  COLLECTED: "healthcare.billing_collected",
  CREATED: "healthcare.billing_created",
  UPDATED: "healthcare.billing_updated",
} as const;

export const RECORDS_EVENTS = {
  CREATED: "healthcare.records_created",
  MERGED: "healthcare.records_merged",
  UPDATED: "healthcare.records_updated",
  VIEWED: "healthcare.records_viewed",
} as const;

export const OPERATIONS_EVENTS = {
  CREATED: "healthcare.operations_created",
  UPDATED: "healthcare.operations_updated",
} as const;

export const BRANCH_EVENTS = {
  CREATED: "healthcare.branch_created",
  UPDATED: "healthcare.branch_updated",
} as const;

export const events = {
  APPOINTMENT_EVENTS,
  BILLING_EVENTS,
  BRANCH_EVENTS,
  ENCOUNTER_EVENTS,
  FACILITY_EVENTS,
  OPERATIONS_EVENTS,
  PATIENT_EVENTS,
  PRACTITIONER_EVENTS,
  RECORDS_EVENTS,
  SERVICE_EVENTS,
};

export interface HealthcareEntityEvent {
  actorId?: string;
  at: string;
  branchId: string;
  data?: Record<string, JsonValue>;
  id: string;
}

export interface PatientEventMap {
  [PATIENT_EVENTS.CREATED]: HealthcareEntityEvent;
  [PATIENT_EVENTS.MERGED]: HealthcareEntityEvent;
  [PATIENT_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface PractitionerEventMap {
  [PRACTITIONER_EVENTS.CREATED]: HealthcareEntityEvent;
  [PRACTITIONER_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface FacilityEventMap {
  [FACILITY_EVENTS.CREATED]: HealthcareEntityEvent;
  [FACILITY_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface ServiceEventMap {
  [SERVICE_EVENTS.CREATED]: HealthcareEntityEvent;
  [SERVICE_EVENTS.REDEEMED]: HealthcareEntityEvent;
  [SERVICE_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface AppointmentEventMap {
  [APPOINTMENT_EVENTS.CREATED]: HealthcareEntityEvent;
  [APPOINTMENT_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface EncounterEventMap {
  [ENCOUNTER_EVENTS.CREATED]: HealthcareEntityEvent;
  [ENCOUNTER_EVENTS.SIGNED]: HealthcareEntityEvent;
  [ENCOUNTER_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface BillingEventMap {
  [BILLING_EVENTS.COLLECTED]: HealthcareEntityEvent;
  [BILLING_EVENTS.CREATED]: HealthcareEntityEvent;
  [BILLING_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface RecordsEventMap {
  [RECORDS_EVENTS.CREATED]: HealthcareEntityEvent;
  [RECORDS_EVENTS.MERGED]: HealthcareEntityEvent;
  [RECORDS_EVENTS.UPDATED]: HealthcareEntityEvent;
  [RECORDS_EVENTS.VIEWED]: HealthcareEntityEvent;
}

export interface OperationsEventMap {
  [OPERATIONS_EVENTS.CREATED]: HealthcareEntityEvent;
  [OPERATIONS_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface BranchEventMap {
  [BRANCH_EVENTS.CREATED]: HealthcareEntityEvent;
  [BRANCH_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export type HealthcareEventMap = AppointmentEventMap &
  BillingEventMap &
  BranchEventMap &
  EncounterEventMap &
  FacilityEventMap &
  OperationsEventMap &
  PatientEventMap &
  PractitionerEventMap &
  RecordsEventMap &
  ServiceEventMap;
