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
