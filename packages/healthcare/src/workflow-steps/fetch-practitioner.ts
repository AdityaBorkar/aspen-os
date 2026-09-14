import type {
  healthcareLeaveBlock,
  healthcarePosting,
  healthcarePractitionerEducation,
  healthcarePractitionerFee,
  healthcarePractitionerRegistration,
  healthcarePractitionerSchedule,
} from "#/db-schemas/practitioners";
import { healthcarePractitioner } from "#/db-schemas/practitioners";
import { WithIdSchema } from "#/schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const fetchPractitionerStep = WorkflowStep.name("healthcare-fetch-practitioner")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcarePractitioner)
      .where(eq(healthcarePractitioner.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Practitioner "${input.id}" not found.`);
    }
    return row;
  });

export interface PractitionerDto {
  branchId: string;
  createdAt: string;
  email: string | null;
  id: string;
  languages: string[];
  name: string;
  overallYrs: number | null;
  phone: string | null;
  specialty: string | null;
  specialistYrs: number | null;
  status: string;
  updatedAt: string;
}

export function toPractitionerDto(
  row: typeof healthcarePractitioner.$inferSelect,
): PractitionerDto {
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    email: row.email,
    id: row.id,
    languages: row.languages,
    name: row.name,
    overallYrs: row.overall_yrs,
    phone: row.phone,
    specialistYrs: row.specialist_yrs,
    specialty: row.specialty,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface RegistrationDto {
  branchId: string;
  council: string;
  createdAt: string;
  id: string;
  practitionerId: string;
  regNo: string;
  updatedAt: string;
  year: number | null;
}

export function toRegistrationDto(
  row: typeof healthcarePractitionerRegistration.$inferSelect,
): RegistrationDto {
  return {
    branchId: row.branch_id,
    council: row.council,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    practitionerId: row.practitioner_id,
    regNo: row.reg_no,
    updatedAt: row.updated_at.toISOString(),
    year: row.year,
  };
}

export interface EducationDto {
  branchId: string;
  createdAt: string;
  degree: string;
  id: string;
  institute: string | null;
  practitionerId: string;
  updatedAt: string;
  year: number | null;
}

export function toEducationDto(
  row: typeof healthcarePractitionerEducation.$inferSelect,
): EducationDto {
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    degree: row.degree,
    id: row.id,
    institute: row.institute,
    practitionerId: row.practitioner_id,
    updatedAt: row.updated_at.toISOString(),
    year: row.year,
  };
}

export interface PostingDto {
  branchId: string;
  createdAt: string;
  facilityId: string | null;
  from: string;
  id: string;
  practitionerId: string;
  to: string | null;
  updatedAt: string;
}

export function toPostingDto(row: typeof healthcarePosting.$inferSelect): PostingDto {
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    facilityId: row.facility_id,
    from: row.from_date,
    id: row.id,
    practitionerId: row.practitioner_id,
    to: row.to_date,
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface PractitionerScheduleDto {
  branchId: string;
  bufferMin: number;
  createdAt: string;
  emergencyCount: number;
  end: string;
  facilityId: string | null;
  id: string;
  practitionerId: string;
  slotMin: number;
  start: string;
  updatedAt: string;
  videoFlag: boolean;
  weekday: string;
}

export function toScheduleDto(
  row: typeof healthcarePractitionerSchedule.$inferSelect,
): PractitionerScheduleDto {
  return {
    branchId: row.branch_id,
    bufferMin: row.buffer_min,
    createdAt: row.created_at.toISOString(),
    emergencyCount: row.emergency_count,
    end: row.end_time,
    facilityId: row.facility_id,
    id: row.id,
    practitionerId: row.practitioner_id,
    slotMin: row.slot_min,
    start: row.start_time,
    updatedAt: row.updated_at.toISOString(),
    videoFlag: row.video_flag,
    weekday: row.weekday,
  };
}

export interface PractitionerFeeDto {
  amount: number;
  branchId: string;
  createdAt: string;
  effectiveFrom: string | null;
  id: string;
  practitionerId: string;
  serviceId: string | null;
  updatedAt: string;
}

export function toFeeDto(row: typeof healthcarePractitionerFee.$inferSelect): PractitionerFeeDto {
  return {
    amount: Number(row.amount),
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    effectiveFrom: row.effective_from,
    id: row.id,
    practitionerId: row.practitioner_id,
    serviceId: row.service_id,
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface LeaveBlockDto {
  branchId: string;
  createdAt: string;
  from: string;
  id: string;
  practitionerId: string;
  reason: string | null;
  to: string;
  updatedAt: string;
}

export function toLeaveBlockDto(row: typeof healthcareLeaveBlock.$inferSelect): LeaveBlockDto {
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    from: row.from_date,
    id: row.id,
    practitionerId: row.practitioner_id,
    reason: row.reason,
    to: row.to_date,
    updatedAt: row.updated_at.toISOString(),
  };
}
