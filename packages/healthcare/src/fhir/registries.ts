export const IDENTIFIER_SYSTEM = {
  ABHA: "https://healthid.ndhm.gov.in",
  HFR: "https://hfr.abdm.gov.in",
  HPR: "https://hpr.abdm.gov.in",
  LOCAL: "urn:aspen-os:local",
  UHID: "urn:aspen-os:uhid",
} as const;

export type IdentifierSystem = (typeof IDENTIFIER_SYSTEM)[keyof typeof IDENTIFIER_SYSTEM];

export const IDENTIFIER_SYSTEM_VALUES = [
  IDENTIFIER_SYSTEM.ABHA,
  IDENTIFIER_SYSTEM.UHID,
  IDENTIFIER_SYSTEM.HPR,
  IDENTIFIER_SYSTEM.HFR,
  IDENTIFIER_SYSTEM.LOCAL,
] as const;

export const CODE_SYSTEM = {
  ICD11: "http://id.who.int/icd/release/11/mms",
  LOCAL: "urn:aspen-os:local-codes",
  LOINC: "http://loinc.org",
  NAMASTE: "https://namaste.ayush.gov.in",
  SNOMED: "http://snomed.info/sct",
  TM2: "http://id.who.int/icd/release/11/tm2",
  UCUM: "http://unitsofmeasure.org",
} as const;

export type CodeSystem = (typeof CODE_SYSTEM)[keyof typeof CODE_SYSTEM];

export const CODE_SYSTEM_VALUES = [
  CODE_SYSTEM.ICD11,
  CODE_SYSTEM.TM2,
  CODE_SYSTEM.NAMASTE,
  CODE_SYSTEM.LOINC,
  CODE_SYSTEM.SNOMED,
  CODE_SYSTEM.UCUM,
  CODE_SYSTEM.LOCAL,
] as const;

export const UCUM_UNIT = {
  BPM: "/min",
  CM: "cm",
  DAYS: "d",
  DEG_C: "Cel",
  KG: "kg",
  MG: "mg",
  ML: "mL",
  MM_HG: "mm[Hg]",
  PERCENT: "%",
  SCORE: "{score}",
} as const;

export type UcumUnit = (typeof UCUM_UNIT)[keyof typeof UCUM_UNIT];

export const UCUM_UNIT_VALUES = [
  UCUM_UNIT.MG,
  UCUM_UNIT.ML,
  UCUM_UNIT.KG,
  UCUM_UNIT.CM,
  UCUM_UNIT.MM_HG,
  UCUM_UNIT.BPM,
  UCUM_UNIT.PERCENT,
  UCUM_UNIT.DEG_C,
  UCUM_UNIT.DAYS,
  UCUM_UNIT.SCORE,
] as const;

export const ENCOUNTER_STATUS_VALUES = [
  "planned",
  "arrived",
  "triaged",
  "in-progress",
  "onleave",
  "finished",
  "cancelled",
] as const;

export type EncounterStatusCanonical = (typeof ENCOUNTER_STATUS_VALUES)[number];

export const ENCOUNTER_STATUS_MAP = {
  ARRIVED: "arrived",
  CANCELLED: "cancelled",
  FINISHED: "finished",
  IN_PROGRESS: "in-progress",
  ONLEAVE: "onleave",
  OPEN: "in-progress",
  PLANNED: "planned",
  SIGNED: "finished",
  TRIAGED: "triaged",
} as const;

export const APPOINTMENT_STATUS_VALUES = [
  "proposed",
  "pending",
  "booked",
  "arrived",
  "fulfilled",
  "cancelled",
  "noshow",
] as const;

export type AppointmentStatusCanonical = (typeof APPOINTMENT_STATUS_VALUES)[number];

export const APPOINTMENT_STATUS_MAP = {
  ARRIVED: "arrived",
  BOOKED: "booked",
  CANCELLED: "cancelled",
  CHECKED_IN: "arrived",
  CONFIRMED: "booked",
  DONE: "fulfilled",
  FULFILLED: "fulfilled",
  IN_CONSULT: "arrived",
  IN_QUEUE: "arrived",
  NOSHOW: "noshow",
  NO_SHOW: "noshow",
  PENDING: "pending",
  PROPOSED: "proposed",
  RESCHEDULED: "booked",
} as const;

export const CONDITION_CLINICAL_VALUES = [
  "active",
  "recurrence",
  "relapse",
  "inactive",
  "remission",
  "resolved",
] as const;

export type ConditionClinicalCanonical = (typeof CONDITION_CLINICAL_VALUES)[number];

export const CONDITION_CLINICAL_MAP = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  RECURRENCE: "recurrence",
  RELAPSE: "relapse",
  REMISSION: "remission",
  RESOLVED: "resolved",
} as const;

export const CONDITION_VERIFICATION_VALUES = [
  "unconfirmed",
  "provisional",
  "differential",
  "confirmed",
  "refuted",
  "entered-in-error",
] as const;

export type ConditionVerificationCanonical = (typeof CONDITION_VERIFICATION_VALUES)[number];

export const CONDITION_VERIFICATION_MAP = {
  CONFIRMED: "confirmed",
  DIFFERENTIAL: "differential",
  ENTERED_IN_ERROR: "entered-in-error",
  PROVISIONAL: "provisional",
  REFUTED: "refuted",
  UNCONFIRMED: "unconfirmed",
} as const;

export const OBSERVATION_STATUS_VALUES = [
  "registered",
  "preliminary",
  "final",
  "amended",
  "corrected",
  "cancelled",
  "entered-in-error",
] as const;

export type ObservationStatusCanonical = (typeof OBSERVATION_STATUS_VALUES)[number];

export const OBSERVATION_STATUS_MAP = {
  AMENDED: "amended",
  AUTHORIZED: "final",
  CANCELLED: "cancelled",
  CORRECTED: "corrected",
  DRAFT: "preliminary",
  ENTERED_IN_ERROR: "entered-in-error",
  FINAL: "final",
  PRELIMINARY: "preliminary",
  REGISTERED: "registered",
} as const;

export const OBSERVATION_INTERPRETATION_VALUES = ["N", "H", "L", "A", "AA"] as const;

export type ObservationInterpretationCanonical = (typeof OBSERVATION_INTERPRETATION_VALUES)[number];

export const OBSERVATION_INTERPRETATION_MAP = {
  A: "A",
  AA: "AA",
  H: "H",
  HIGH: "H",
  L: "L",
  LOW: "L",
  N: "N",
  NORMAL: "N",
} as const;

export const ALLERGY_CRITICALITY_VALUES = ["low", "high", "unable-to-assess"] as const;

export type AllergyCriticalityCanonical = (typeof ALLERGY_CRITICALITY_VALUES)[number];

export const ALLERGY_CRITICALITY_MAP = {
  HIGH: "high",
  LOW: "low",
  MILD: "low",
  MODERATE: "low",
  SEVERE: "high",
  UNABLE_TO_ASSESS: "unable-to-assess",
} as const;

export const ADMIN_GENDER_VALUES = ["male", "female", "other", "unknown"] as const;

export type AdminGenderCanonical = (typeof ADMIN_GENDER_VALUES)[number];

export const ADMIN_GENDER_MAP = {
  FEMALE: "female",
  MALE: "male",
  OTHER: "other",
  UNKNOWN: "unknown",
} as const;

export const INVOICE_STATUS_VALUES = [
  "draft",
  "issued",
  "balanced",
  "cancelled",
  "entered-in-error",
] as const;

export type InvoiceStatusCanonical = (typeof INVOICE_STATUS_VALUES)[number];

export const INVOICE_STATUS_MAP = {
  BALANCED: "balanced",
  CANCELLED: "cancelled",
  DRAFT: "draft",
  ENTERED_IN_ERROR: "entered-in-error",
  FINAL: "issued",
  ISSUED: "issued",
  PAID: "balanced",
  PARTIAL: "balanced",
} as const;

export const MEDREQ_STATUS_VALUES = [
  "active",
  "on-hold",
  "cancelled",
  "completed",
  "entered-in-error",
] as const;

export type MedreqStatusCanonical = (typeof MEDREQ_STATUS_VALUES)[number];

export const MEDREQ_STATUS_MAP = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  ENTERED_IN_ERROR: "entered-in-error",
  ON_HOLD: "on-hold",
} as const;

export const MEDREQ_INTENT_VALUES = ["order", "plan"] as const;

export type MedreqIntentCanonical = (typeof MEDREQ_INTENT_VALUES)[number];

export const MEDREQ_INTENT = "order";

export const DISPENSE_STATUS_VALUES = [
  "preparation",
  "in-progress",
  "cancelled",
  "on-hold",
  "completed",
  "declined",
] as const;

export type DispenseStatusCanonical = (typeof DISPENSE_STATUS_VALUES)[number];

export const DISPENSE_STATUS_MAP = {
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  DECLINED: "declined",
  FULFILLED: "completed",
  IN_PROGRESS: "in-progress",
  ON_HOLD: "on-hold",
  PARTIAL: "in-progress",
  PENDING: "in-progress",
  PREPARATION: "preparation",
} as const;

export const SERVICEREQ_STATUS_VALUES = [
  "draft",
  "active",
  "on-hold",
  "revoked",
  "completed",
  "entered-in-error",
] as const;

export type ServicereqStatusCanonical = (typeof SERVICEREQ_STATUS_VALUES)[number];

export const SERVICEREQ_STATUS_MAP = {
  ACTIVE: "active",
  CANCELLED: "revoked",
  COMPLETED: "completed",
  DELIVERED: "completed",
  DRAFT: "draft",
  ENTERED_IN_ERROR: "entered-in-error",
  ON_HOLD: "on-hold",
  ORDERED: "active",
  REPORTED: "completed",
  REVOKED: "revoked",
} as const;

export const SERVICEREQ_INTENT_VALUES = ["order", "plan"] as const;

export type ServicereqIntentCanonical = (typeof SERVICEREQ_INTENT_VALUES)[number];

export const SERVICEREQ_INTENT = "order";

export const SPECIMEN_STATUS_VALUES = [
  "available",
  "unavailable",
  "unsatisfactory",
  "entered-in-error",
] as const;

export type SpecimenStatusCanonical = (typeof SPECIMEN_STATUS_VALUES)[number];

export const SPECIMEN_STATUS_MAP = {
  ACCEPTED: "available",
  AVAILABLE: "available",
  COLLECTED: "available",
  ENTERED_IN_ERROR: "entered-in-error",
  PENDING: "unavailable",
  RECEIVED: "available",
  REJECTED: "unsatisfactory",
  UNAVAILABLE: "unavailable",
  UNSATISFACTORY: "unsatisfactory",
} as const;

export const DOCREF_STATUS_VALUES = ["current", "superseded", "entered-in-error"] as const;

export type DocrefStatusCanonical = (typeof DOCREF_STATUS_VALUES)[number];

export const DOCREF_STATUS_MAP = {
  CURRENT: "current",
  ENTERED_IN_ERROR: "entered-in-error",
  SUPERSEDED: "superseded",
  VOID: "superseded",
} as const;

export const DOC_STATUS_VALUES = ["preliminary", "final", "amended"] as const;

export type DocStatusCanonical = (typeof DOC_STATUS_VALUES)[number];

export const DOC_STATUS_MAP = {
  AMENDED: "amended",
  DRAFT: "preliminary",
  FINAL: "final",
  ISSUED: "final",
  PRELIMINARY: "preliminary",
  PUBLISHED: "final",
  SIGNED: "final",
} as const;
