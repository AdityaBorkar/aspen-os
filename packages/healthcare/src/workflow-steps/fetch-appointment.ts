import type {
  healthcareCertificate,
  healthcareQueueToken,
  healthcareVideoSession,
} from "#/db-schemas/appointments";
import { healthcareAppointment } from "#/db-schemas/appointments";
import { WithIdSchema } from "#/schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { boolean, is, string } from "valibot";

export const fetchAppointmentStep = WorkflowStep.name("healthcare-fetch-appointment")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcareAppointment)
      .where(eq(healthcareAppointment.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Appointment "${input.id}" not found.`);
    }
    return row;
  });

export interface AppointmentDto {
  branchId: string;
  createdAt: string;
  daycare: boolean;
  durationMin: number | null;
  facilityId: string | null;
  id: string;
  note: string | null;
  patientId: string;
  practitionerId: string;
  pricelist: string;
  serviceId: string | null;
  slotStart: string;
  status: string;
  tele: boolean;
  updatedAt: string;
}

export function toAppointmentDto(row: typeof healthcareAppointment.$inferSelect): AppointmentDto {
  const { payload } = row;
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    daycare: row.daycare,
    durationMin: row.duration_min,
    facilityId: row.facility_id,
    id: row.id,
    note: is(string(), payload.note) ? payload.note : null,
    patientId: row.patient_id,
    practitionerId: row.practitioner_id,
    pricelist: row.pricelist,
    serviceId: row.service_id,
    slotStart: row.slot_start.toISOString(),
    status: row.status,
    tele: row.tele,
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface QueueTokenDto {
  branchId: string;
  calledAt: string | null;
  createdAt: string;
  facilityId: string | null;
  id: string;
  patientId: string | null;
  practitionerId: string | null;
  status: string;
  tokenNo: number;
  walkin: boolean;
}

export function toQueueTokenDto(row: typeof healthcareQueueToken.$inferSelect): QueueTokenDto {
  return {
    branchId: row.branch_id,
    calledAt: row.called_at ? row.called_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    facilityId: row.facility_id,
    id: row.id,
    patientId: row.patient_id,
    practitionerId: row.practitioner_id,
    status: row.status,
    tokenNo: row.token_no,
    walkin: row.walkin,
  };
}

export interface VideoSessionDto {
  appointmentId: string;
  branchId: string;
  consentGranted: boolean | null;
  createdAt: string;
  expiresAt: string | null;
  id: string;
  joinLink: string | null;
  patientId: string | null;
  practitionerId: string | null;
  status: string;
}

export function toVideoSessionDto(
  row: typeof healthcareVideoSession.$inferSelect,
): VideoSessionDto {
  const { payload } = row;
  return {
    appointmentId: row.appointment_id,
    branchId: row.branch_id,
    consentGranted: is(boolean(), payload.consentGranted) ? payload.consentGranted : null,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    id: row.id,
    joinLink: row.join_link,
    patientId: row.patient_id,
    practitionerId: row.practitioner_id,
    status: row.status,
  };
}

export interface CertificateDto {
  appointmentId: string | null;
  body: string;
  branchId: string;
  createdAt: string;
  id: string;
  patientId: string | null;
  status: string;
  type: string;
}

export function toCertificateDto(row: typeof healthcareCertificate.$inferSelect): CertificateDto {
  return {
    appointmentId: row.appointment_id,
    body: row.body,
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    patientId: row.patient_id,
    status: row.status,
    type: row.cert_type,
  };
}
