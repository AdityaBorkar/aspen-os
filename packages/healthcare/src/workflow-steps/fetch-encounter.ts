import type {
  healthcareClinicOrder,
  healthcareEncounterAddendum,
  healthcareEncounterDiagnosis,
  healthcareFollowUp,
  healthcarePrescription,
  healthcareVitals,
} from "#/db-schemas/encounters";
import { healthcareEncounter } from "#/db-schemas/encounters";
import {
  diagnosisVerificationFromKind,
  normalizeEncounterFhirStatus,
} from "#/workflow-steps/canonical-dual-write";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, optional, string, is } from "valibot";

const PrescriptionFhirSchema = object({
  intent: optional(string()),
  status: optional(string()),
});

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
 * same patient. Signed (canonical finished) encounters are immutable; only
 * addenda may follow. The in-progress literal is accepted as the canonical
 * alias of open so unified Condition/Observation writers stay frozen after
 * sign regardless of which axis a caller speaks.
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
    if (normalizeEncounterFhirStatus(row.status) !== "in-progress") {
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
  fhirStatus: string;
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
    fhirStatus: normalizeEncounterFhirStatus(row.status),
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
  clinicalStatus: string;
  code: string;
  createdAt: string;
  encounterId: string;
  id: string;
  kind: string;
  label: string;
  patientId: string;
  primary: boolean;
  verificationStatus: string;
}

export function toDiagnosisDto(
  row: typeof healthcareEncounterDiagnosis.$inferSelect,
): DiagnosisDto {
  return {
    branchId: row.branch_id,
    clinicalStatus: "active",
    code: row.code,
    createdAt: row.created_at.toISOString(),
    encounterId: row.encounter_id,
    id: row.id,
    kind: row.kind,
    label: row.label,
    patientId: row.patient_id,
    primary: row.is_primary,
    verificationStatus: diagnosisVerificationFromKind(row.kind, undefined),
  };
}

export interface PrescriptionDto {
  branchId: string;
  createdAt: string;
  encounterId: string;
  id: string;
  intent: string;
  items: unknown[];
  patientId: string;
  status: string;
}

export function toPrescriptionDto(
  row: typeof healthcarePrescription.$inferSelect,
): PrescriptionDto {
  const { items } = row.payload;
  const { fhir } = row.payload;
  const header = is(PrescriptionFhirSchema, fhir) ? fhir : null;
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    encounterId: row.encounter_id,
    id: row.id,
    intent: header?.intent ?? "order",
    items: Array.isArray(items) ? items : [],
    patientId: row.patient_id,
    status: header?.status ?? "active",
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
  receivingUnit: string | null;
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
    receivingUnit: is(string(), row.payload.receivingUnit) ? row.payload.receivingUnit : null,
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
