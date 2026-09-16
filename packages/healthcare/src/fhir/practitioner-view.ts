import type {
  HealthcareLeaveBlock,
  HealthcarePosting,
  HealthcarePractitioner,
  HealthcarePractitionerEducation,
  HealthcarePractitionerFee,
  HealthcarePractitionerRegistration,
  HealthcarePractitionerSchedule,
} from "#/db-schemas/practitioners";

import { is, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

import type { FhirExtensionInput } from "./fhir-extension";
import { ADMIN_GENDER_MAP, IDENTIFIER_SYSTEM } from "./registries";
import type { AdminGenderCanonical } from "./registries";

export type FhirDayOfWeek = "fri" | "mon" | "sat" | "sun" | "thu" | "tue" | "wed";

export interface FhirPractitionerIdentifier {
  assigner: string | null;
  system: string;
  value: string;
}

export interface FhirPractitionerTelecom {
  system: "email" | "phone";
  use: "work";
  value: string;
}

export interface FhirPractitionerQualification {
  code: string;
  issuer: string | null;
  start: string | null;
}

export interface FhirPractitionerView {
  active: boolean;
  communication: string[];
  extension: FhirExtensionInput[];
  gender: AdminGenderCanonical;
  id: string;
  identifier: FhirPractitionerIdentifier[];
  name: string;
  qualification: FhirPractitionerQualification[];
  resourceType: "Practitioner";
  telecom: FhirPractitionerTelecom[];
}

export interface FhirPractitionerAvailableTime {
  availableEndTime: string;
  availableStartTime: string;
  daysOfWeek: FhirDayOfWeek[];
}

export interface FhirPractitionerNotAvailable {
  description: string | null;
  end: string;
  start: string;
}

export interface FhirPractitionerRoleKin {
  fees: HealthcarePractitionerFee[];
  leaves: HealthcareLeaveBlock[];
  postings: HealthcarePosting[];
  schedules: HealthcarePractitionerSchedule[];
  specialty: string | null;
}

export interface FhirFreeSlotQuery {
  bookedDates: string[];
  fromDate: string;
  leaves: HealthcareLeaveBlock[];
}

export interface FhirPractitionerRoleView {
  availableTime: FhirPractitionerAvailableTime[];
  extension: FhirExtensionInput[];
  id: string;
  location: string[];
  notAvailable: FhirPractitionerNotAvailable[];
  organization: string | null;
  practitioner: string;
  resourceType: "PractitionerRole";
  specialty: string[];
}

const PractitionerFhirOverlaySchema = object({
  gender: optional(string()),
});

type PractitionerFhirOverlay = InferOutput<typeof PractitionerFhirOverlaySchema>;

function readPractitionerOverlay(
  payload: HealthcarePractitioner["payload"],
): PractitionerFhirOverlay | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  const raw = payload.fhir;
  if (raw instanceof Date || Array.isArray(raw)) {
    return null;
  }
  return is(PractitionerFhirOverlaySchema, raw) ? raw : null;
}

function mapGender(raw: string | null): AdminGenderCanonical {
  if (raw === null) {
    return ADMIN_GENDER_MAP.UNKNOWN;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "male") {
    return ADMIN_GENDER_MAP.MALE;
  }
  if (normalized === "female") {
    return ADMIN_GENDER_MAP.FEMALE;
  }
  if (normalized === "other") {
    return ADMIN_GENDER_MAP.OTHER;
  }
  return ADMIN_GENDER_MAP.UNKNOWN;
}

function mapWeekday(raw: string): FhirDayOfWeek | null {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "monday" || normalized === "mon") {
    return "mon";
  }
  if (normalized === "tuesday" || normalized === "tue") {
    return "tue";
  }
  if (normalized === "wednesday" || normalized === "wed") {
    return "wed";
  }
  if (normalized === "thursday" || normalized === "thu") {
    return "thu";
  }
  if (normalized === "friday" || normalized === "fri") {
    return "fri";
  }
  if (normalized === "saturday" || normalized === "sat") {
    return "sat";
  }
  if (normalized === "sunday" || normalized === "sun") {
    return "sun";
  }
  return null;
}

function weekdayCode(dayIndex: number): FhirDayOfWeek {
  if (dayIndex === 0) {
    return "sun";
  }
  if (dayIndex === 1) {
    return "mon";
  }
  if (dayIndex === 2) {
    return "tue";
  }
  if (dayIndex === 3) {
    return "wed";
  }
  if (dayIndex === 4) {
    return "thu";
  }
  if (dayIndex === 5) {
    return "fri";
  }
  if (dayIndex === 6) {
    return "sat";
  }
  return "mon";
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addLocation(location: string[], value: string | null): void {
  if (value === null || location.includes(value)) {
    return;
  }
  location.push(value);
}

export function toFhirPractitionerView(
  row: HealthcarePractitioner,
  registrations: HealthcarePractitionerRegistration[],
  education: HealthcarePractitionerEducation[],
): FhirPractitionerView {
  const overlay = readPractitionerOverlay(row.payload);

  const identifier: FhirPractitionerIdentifier[] = [
    { assigner: row.branch_id, system: IDENTIFIER_SYSTEM.LOCAL, value: row.id },
  ];
  for (const registration of registrations) {
    identifier.push({
      assigner: registration.council,
      system: IDENTIFIER_SYSTEM.HPR,
      value: registration.reg_no,
    });
  }

  const telecom: FhirPractitionerTelecom[] = [];
  if (row.phone !== null) {
    telecom.push({ system: "phone", use: "work", value: row.phone });
  }
  if (row.email !== null) {
    telecom.push({ system: "email", use: "work", value: row.email });
  }

  return {
    active: row.status === "active",
    communication: Array.isArray(row.languages) ? row.languages : [],
    extension: [],
    gender: mapGender(overlay?.gender ?? null),
    id: row.id,
    identifier,
    name: row.name,
    qualification: education.map((entry) => ({
      code: entry.degree,
      issuer: entry.institute,
      start: entry.year === null ? null : String(entry.year),
    })),
    resourceType: "Practitioner",
    telecom,
  };
}

export function toFhirPractitionerRoleView(
  practitionerId: string,
  kin: FhirPractitionerRoleKin,
): FhirPractitionerRoleView {
  const location: string[] = [];
  for (const posting of kin.postings) {
    if (posting.facility_id !== null) {
      addLocation(location, `Location/${posting.facility_id}`);
    }
  }
  for (const schedule of kin.schedules) {
    if (schedule.facility_id !== null) {
      addLocation(location, `Location/${schedule.facility_id}`);
    }
  }

  const [firstPosting] = kin.postings;

  const availableTime: FhirPractitionerAvailableTime[] = [];
  const extension: FhirExtensionInput[] = [];
  for (const schedule of kin.schedules) {
    const day = mapWeekday(schedule.weekday);
    if (day === null) {
      extension.push({
        url: "urn:aspen-os:schedule-raw",
        valueString: `${schedule.weekday} ${schedule.start_time}-${schedule.end_time}`,
      });
      continue;
    }
    availableTime.push({
      availableEndTime: schedule.end_time,
      availableStartTime: schedule.start_time,
      daysOfWeek: [day],
    });
    if (schedule.video_flag) {
      extension.push({ url: "urn:aspen-os:schedule-tele", valueString: schedule.weekday });
    }
  }

  for (const fee of kin.fees) {
    extension.push({
      url: "urn:aspen-os:consult-fee",
      valueCodeableConcept: fee.service_id === null ? undefined : { text: fee.service_id },
      valueString: fee.amount,
    });
  }

  return {
    availableTime,
    extension,
    id: `role-${practitionerId}`,
    location,
    notAvailable: kin.leaves.map((leave) => ({
      description: leave.reason,
      end: leave.to_date,
      start: leave.from_date,
    })),
    organization: firstPosting === undefined ? null : `Organization/${firstPosting.branch_id}`,
    practitioner: `Practitioner/${practitionerId}`,
    resourceType: "PractitionerRole",
    specialty: kin.specialty === null ? [] : [kin.specialty],
  };
}

export function leaveConflict(
  leaves: HealthcareLeaveBlock[],
  date: string,
): HealthcareLeaveBlock | null {
  for (const leave of leaves) {
    if (leave.from_date <= date && date <= leave.to_date) {
      return leave;
    }
  }
  return null;
}

function hasScheduleOn(schedules: HealthcarePractitionerSchedule[], day: FhirDayOfWeek): boolean {
  for (const schedule of schedules) {
    if (mapWeekday(schedule.weekday) === day) {
      return true;
    }
  }
  return false;
}

export function nextFreeSlot(
  schedules: HealthcarePractitionerSchedule[],
  query: FhirFreeSlotQuery,
): string | null {
  const start = new Date(`${query.fromDate}T00:00:00Z`);
  for (let offset = 0; offset < 14; offset += 1) {
    const cursor = new Date(start);
    cursor.setUTCDate(cursor.getUTCDate() + offset);
    const day = weekdayCode(cursor.getUTCDay());
    const date = isoDate(cursor);
    if (!hasScheduleOn(schedules, day)) {
      continue;
    }
    if (leaveConflict(query.leaves, date) !== null) {
      continue;
    }
    if (query.bookedDates.includes(date)) {
      continue;
    }
    return date;
  }
  return null;
}
