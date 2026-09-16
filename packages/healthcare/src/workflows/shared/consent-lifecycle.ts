import { healthcareDentalConsent } from "#/db-schemas/dental";
import { healthcareConsent } from "#/db-schemas/patient";
import { healthcareCaregiverConsent } from "#/db-schemas/psych";
import { healthcareConsentGrant } from "#/db-schemas/records";
import { AUDIT_ACTION } from "#/utils/constants";

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type HealthcareDB = PostgresJsDatabase;

export function signedAuditAction(status: string): string {
  return status === "Signed" ? AUDIT_ACTION.SIGNED : AUDIT_ACTION.CREATED;
}

// Unified write path: the four consent stores keep their own tables and
// per-source guards/audit topics, but every insert goes through one of these
// helpers so column mapping and status defaults cannot drift apart again.
export async function insertPatientConsent(
  db: HealthcareDB,
  input: {
    branchId: string;
    granted: boolean;
    note: string | null;
    patientId: string;
    type: string;
  },
): Promise<typeof healthcareConsent.$inferSelect | null> {
  const [row] = await db
    .insert(healthcareConsent)
    .values({
      archived_at: new Date(),
      branch_id: input.branchId,
      granted: input.granted,
      note: input.note,
      patient_id: input.patientId,
      type: input.type,
    })
    .returning();
  return row ?? null;
}

export async function insertGrantConsent(
  db: HealthcareDB,
  input: {
    branchId: string;
    encounterId: string | null;
    grantedBy: string | null;
    kind: string;
    patientId: string;
  },
): Promise<typeof healthcareConsentGrant.$inferSelect | null> {
  const [row] = await db
    .insert(healthcareConsentGrant)
    .values({
      branch_id: input.branchId,
      encounter_id: input.encounterId,
      granted_by: input.grantedBy,
      kind: input.kind,
      patient_id: input.patientId,
      status: "granted",
    })
    .returning();
  return row ?? null;
}

export async function insertDentalConsent(
  db: HealthcareDB,
  input: {
    branchId: string;
    createdBy: string;
    encounterId: string;
    patientId: string;
    procedureName: string;
    status: string;
  },
): Promise<typeof healthcareDentalConsent.$inferSelect | null> {
  const [row] = await db
    .insert(healthcareDentalConsent)
    .values({
      branch_id: input.branchId,
      created_by: input.createdBy,
      encounter_id: input.encounterId,
      patient_id: input.patientId,
      procedure_name: input.procedureName,
      signed_at: input.status === "Signed" ? new Date() : null,
      status: input.status,
    })
    .returning();
  return row ?? null;
}

export async function insertCaregiverConsent(
  db: HealthcareDB,
  input: {
    branchId: string;
    caregiverName: string;
    createdBy: string;
    encounterId: string | null;
    idNumber: string | null;
    patientId: string;
    patientIsMinor: boolean;
    relation: string;
    scope: string;
    status: string;
  },
): Promise<typeof healthcareCaregiverConsent.$inferSelect | null> {
  const [row] = await db
    .insert(healthcareCaregiverConsent)
    .values({
      branch_id: input.branchId,
      caregiver_name: input.caregiverName,
      created_by: input.createdBy,
      encounter_id: input.encounterId,
      patient_id: input.patientId,
      payload: {
        idNumber: input.idNumber,
        patientIsMinor: input.patientIsMinor,
      },
      relation: input.relation,
      scope: input.scope,
      status: input.status,
    })
    .returning();
  return row ?? null;
}

export type ConsentSource = "caregiver" | "dental" | "grant" | "patient";

export interface UnifiedConsent {
  detail: string;
  encounterId: string | null;
  grantedBy: string | null;
  id: string;
  source: ConsentSource;
  status: string;
}

export async function listPatientConsents(
  db: HealthcareDB,
  branchId: string,
  patientId: string,
): Promise<UnifiedConsent[]> {
  const [grants, patient, dental, caregiver] = await Promise.all([
    db
      .select()
      .from(healthcareConsentGrant)
      .where(
        and(
          eq(healthcareConsentGrant.branch_id, branchId),
          eq(healthcareConsentGrant.patient_id, patientId),
        ),
      )
      .limit(200),
    db
      .select()
      .from(healthcareConsent)
      .where(
        and(eq(healthcareConsent.branch_id, branchId), eq(healthcareConsent.patient_id, patientId)),
      )
      .limit(200),
    db
      .select()
      .from(healthcareDentalConsent)
      .where(
        and(
          eq(healthcareDentalConsent.branch_id, branchId),
          eq(healthcareDentalConsent.patient_id, patientId),
        ),
      )
      .limit(200),
    db
      .select()
      .from(healthcareCaregiverConsent)
      .where(
        and(
          eq(healthcareCaregiverConsent.branch_id, branchId),
          eq(healthcareCaregiverConsent.patient_id, patientId),
        ),
      )
      .limit(200),
  ]);
  return [
    ...grants.map((row): UnifiedConsent => ({
      detail: row.kind,
      encounterId: row.encounter_id,
      grantedBy: row.granted_by,
      id: row.id,
      source: "grant",
      status: row.status,
    })),
    ...patient.map((row): UnifiedConsent => ({
      detail: row.type,
      encounterId: null,
      grantedBy: null,
      id: row.id,
      source: "patient",
      status: row.granted ? "granted" : "withdrawn",
    })),
    ...dental.map((row): UnifiedConsent => ({
      detail: row.procedure_name,
      encounterId: row.encounter_id,
      grantedBy: row.created_by,
      id: row.id,
      source: "dental",
      status: row.status,
    })),
    ...caregiver.map((row): UnifiedConsent => ({
      detail: row.scope,
      encounterId: row.encounter_id,
      grantedBy: row.created_by,
      id: row.id,
      source: "caregiver",
      status: row.status,
    })),
  ];
}
