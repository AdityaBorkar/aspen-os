import type {
  healthcareClinicOrder,
  healthcareEncounterAddendum,
  healthcareEncounterDiagnosis,
  healthcareFollowUp,
  healthcarePrescription,
  healthcareVitals,
} from "#/db-schemas/encounters";
import { healthcareEncounter } from "#/db-schemas/encounters";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchEncounterStep = WorkflowStep.name("healthcare-fetch-encounter")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcareEncounter)
      .where(eq(healthcareEncounter.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Encounter "${input.id}" not found.`);
    }
    return row;
  });

const OpenEncounterInputSchema = object({ id: string(), patientId: string() });

/**
 * Specialty writes require a parent encounter that is Open and belongs to the
 * same patient. Signed encounters are immutable; only addenda may follow.
 */
export const fetchOpenEncounterStep = WorkflowStep.name("healthcare-fetch-open-encounter")
  .input(OpenEncounterInputSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcareEncounter)
      .where(eq(healthcareEncounter.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Encounter "${input.id}" not found.`);
    }
    if (row.status !== "open") {
      throw new Error(`Encounter "${input.id}" is signed and immutable; add an addendum instead.`);
    }
    if (row.patient_id !== input.patientId) {
      throw new Error(
        `Encounter "${input.id}" belongs to another patient; verify the patient and retry.`,
      );
    }
    return row;
  });

export interface EncounterDto {
  appointmentId: string | null;
  branchId: string;
  createdAt: string;
  id: string;
  patientId: string;
  specialty: string;
  status: string;
  updatedAt: string;
  visitType: string;
}

export function toEncounterDto(row: typeof healthcareEncounter.$inferSelect): EncounterDto {
  return {
    appointmentId: row.appointment_id,
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    patientId: row.patient_id,
    specialty: row.specialty,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
    visitType: row.visit_type,
  };
}

export interface DiagnosisDto {
  branchId: string;
  code: string;
  createdAt: string;
  encounterId: string;
  id: string;
  kind: string;
  label: string;
  patientId: string;
  primary: boolean;
}

export function toDiagnosisDto(
  row: typeof healthcareEncounterDiagnosis.$inferSelect,
): DiagnosisDto {
  return {
    branchId: row.branch_id,
    code: row.code,
    createdAt: row.created_at.toISOString(),
    encounterId: row.encounter_id,
    id: row.id,
    kind: row.kind,
    label: row.label,
    patientId: row.patient_id,
    primary: row.is_primary,
  };
}

export interface PrescriptionDto {
  branchId: string;
  createdAt: string;
  encounterId: string;
  id: string;
  items: unknown[];
  patientId: string;
}

export function toPrescriptionDto(
  row: typeof healthcarePrescription.$inferSelect,
): PrescriptionDto {
  const { items } = row.payload;
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    encounterId: row.encounter_id,
    id: row.id,
    items: Array.isArray(items) ? items : [],
    patientId: row.patient_id,
  };
}

export interface VitalsDto {
  bp: string | null;
  branchId: string;
  createdAt: string;
  encounterId: string;
  id: string;
  patientId: string;
  pulse: number | null;
  spo2: number | null;
  tempC: string | null;
  weightKg: string | null;
}

export function toVitalsDto(row: typeof healthcareVitals.$inferSelect): VitalsDto {
  return {
    bp: row.bp,
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    encounterId: row.encounter_id,
    id: row.id,
    patientId: row.patient_id,
    pulse: row.pulse,
    spo2: row.spo2,
    tempC: row.temp_c,
    weightKg: row.weight_kg,
  };
}

export interface ClinicOrderDto {
  branchId: string;
  createdAt: string;
  encounterId: string;
  id: string;
  item: string;
  kind: string;
  note: string | null;
  patientId: string;
  status: string;
}

export function toClinicOrderDto(row: typeof healthcareClinicOrder.$inferSelect): ClinicOrderDto {
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    encounterId: row.encounter_id,
    id: row.id,
    item: row.item,
    kind: row.kind,
    note: row.note,
    patientId: row.patient_id,
    status: row.status,
  };
}

export interface FollowUpDto {
  at: string;
  branchId: string;
  createdAt: string;
  encounterId: string | null;
  id: string;
  note: string | null;
  patientId: string;
}

export function toFollowUpDto(row: typeof healthcareFollowUp.$inferSelect): FollowUpDto {
  return {
    at: row.at,
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    encounterId: row.encounter_id,
    id: row.id,
    note: row.note,
    patientId: row.patient_id,
  };
}

export interface EncounterAddendumDto {
  branchId: string;
  createdAt: string;
  createdBy: string | null;
  encounterId: string;
  id: string;
  note: string;
}

export function toEncounterAddendumDto(
  row: typeof healthcareEncounterAddendum.$inferSelect,
): EncounterAddendumDto {
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    createdBy: row.created_by,
    encounterId: row.encounter_id,
    id: row.id,
    note: row.note,
  };
}
