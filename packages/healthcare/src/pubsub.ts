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

export const ALLOPATHY_EVENTS = {
  CREATED: "healthcare.allopathy_created",
  UPDATED: "healthcare.allopathy_updated",
} as const;

export const DENTAL_EVENTS = {
  CREATED: "healthcare.dental_created",
  UPDATED: "healthcare.dental_updated",
} as const;

export const AYUSH_EVENTS = {
  CREATED: "healthcare.ayush_created",
  UPDATED: "healthcare.ayush_updated",
} as const;

export const REHAB_EVENTS = {
  CREATED: "healthcare.rehab_created",
  UPDATED: "healthcare.rehab_updated",
} as const;

export const PSYCH_EVENTS = {
  CREATED: "healthcare.psych_created",
  UPDATED: "healthcare.psych_updated",
} as const;

export const RESIDENT_EVENTS = {
  CREATED: "healthcare.resident_created",
  UPDATED: "healthcare.resident_updated",
} as const;

export const PHARMACY_EVENTS = {
  CREATED: "healthcare.pharmacy_created",
  DISPENSED: "healthcare.pharmacy_dispensed",
  UPDATED: "healthcare.pharmacy_updated",
} as const;

export const DIAGNOSTICS_EVENTS = {
  AUTHORIZED: "healthcare.diagnostics_authorized",
  CREATED: "healthcare.diagnostics_created",
  UPDATED: "healthcare.diagnostics_updated",
} as const;

export const BILLING_EVENTS = {
  COLLECTED: "healthcare.billing_collected",
  CREATED: "healthcare.billing_created",
  UPDATED: "healthcare.billing_updated",
} as const;

export const NURSING_EVENTS = {
  CREATED: "healthcare.nursing_created",
  ESCALATED: "healthcare.nursing_escalated",
  UPDATED: "healthcare.nursing_updated",
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
  ALLOPATHY_EVENTS,
  APPOINTMENT_EVENTS,
  AYUSH_EVENTS,
  BILLING_EVENTS,
  BRANCH_EVENTS,
  DENTAL_EVENTS,
  DIAGNOSTICS_EVENTS,
  ENCOUNTER_EVENTS,
  FACILITY_EVENTS,
  NURSING_EVENTS,
  OPERATIONS_EVENTS,
  PATIENT_EVENTS,
  PHARMACY_EVENTS,
  PRACTITIONER_EVENTS,
  PSYCH_EVENTS,
  RECORDS_EVENTS,
  REHAB_EVENTS,
  RESIDENT_EVENTS,
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

export interface AllopathyEventMap {
  [ALLOPATHY_EVENTS.CREATED]: HealthcareEntityEvent;
  [ALLOPATHY_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface DentalEventMap {
  [DENTAL_EVENTS.CREATED]: HealthcareEntityEvent;
  [DENTAL_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface AyushEventMap {
  [AYUSH_EVENTS.CREATED]: HealthcareEntityEvent;
  [AYUSH_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface RehabEventMap {
  [REHAB_EVENTS.CREATED]: HealthcareEntityEvent;
  [REHAB_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface PsychEventMap {
  [PSYCH_EVENTS.CREATED]: HealthcareEntityEvent;
  [PSYCH_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface ResidentEventMap {
  [RESIDENT_EVENTS.CREATED]: HealthcareEntityEvent;
  [RESIDENT_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface PharmacyEventMap {
  [PHARMACY_EVENTS.CREATED]: HealthcareEntityEvent;
  [PHARMACY_EVENTS.DISPENSED]: HealthcareEntityEvent;
  [PHARMACY_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface DiagnosticsEventMap {
  [DIAGNOSTICS_EVENTS.AUTHORIZED]: HealthcareEntityEvent;
  [DIAGNOSTICS_EVENTS.CREATED]: HealthcareEntityEvent;
  [DIAGNOSTICS_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface BillingEventMap {
  [BILLING_EVENTS.COLLECTED]: HealthcareEntityEvent;
  [BILLING_EVENTS.CREATED]: HealthcareEntityEvent;
  [BILLING_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface NursingEventMap {
  [NURSING_EVENTS.CREATED]: HealthcareEntityEvent;
  [NURSING_EVENTS.ESCALATED]: HealthcareEntityEvent;
  [NURSING_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface RecordsEventMap {
  [RECORDS_EVENTS.CREATED]: HealthcareEntityEvent;
  [RECORDS_EVENTS.MERGED]: HealthcareEntityEvent;
  [RECORDS_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface OperationsEventMap {
  [OPERATIONS_EVENTS.CREATED]: HealthcareEntityEvent;
  [OPERATIONS_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export interface BranchEventMap {
  [BRANCH_EVENTS.CREATED]: HealthcareEntityEvent;
  [BRANCH_EVENTS.UPDATED]: HealthcareEntityEvent;
}

export type HealthcareEventMap = AllopathyEventMap &
  AppointmentEventMap &
  AyushEventMap &
  BillingEventMap &
  BranchEventMap &
  DentalEventMap &
  DiagnosticsEventMap &
  EncounterEventMap &
  FacilityEventMap &
  NursingEventMap &
  OperationsEventMap &
  PatientEventMap &
  PharmacyEventMap &
  PractitionerEventMap &
  PsychEventMap &
  RecordsEventMap &
  RehabEventMap &
  ResidentEventMap &
  ServiceEventMap;
