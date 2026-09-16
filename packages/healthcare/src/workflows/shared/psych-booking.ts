import type { healthcareRiskFlag } from "#/db-schemas/psych";
import { healthcareCaregiverConsent, healthcareSafetyPlan } from "#/db-schemas/psych";

import type { JsonValue } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type HealthcareDB = PostgresJsDatabase;

type RiskRow = typeof healthcareRiskFlag.$inferSelect;

function riskWasAlerted(risk: RiskRow): boolean {
  const alerts: JsonValue | undefined = risk.payload.alerts;
  return Array.isArray(alerts) && alerts.length > 0;
}

export interface PatientScope {
  branchId: string;
  patientId: string;
}

export async function assertRiskCleared(
  db: HealthcareDB,
  scope: PatientScope,
  risk: RiskRow | null,
): Promise<void> {
  if (!risk || (risk.level !== "Moderate" && risk.level !== "High")) {
    return;
  }
  const [plan] = await db
    .select({ id: healthcareSafetyPlan.id })
    .from(healthcareSafetyPlan)
    .where(
      and(
        eq(healthcareSafetyPlan.patient_id, scope.patientId),
        eq(healthcareSafetyPlan.branch_id, scope.branchId),
      ),
    )
    .limit(1);
  if (!plan || !riskWasAlerted(risk)) {
    throw new Error(
      `${risk.level} risk on file: complete a safety plan and alert a senior before further sessions`,
    );
  }
}

export async function assertMinorConsent(
  db: HealthcareDB,
  scope: PatientScope,
  message: string,
): Promise<void> {
  const [consent] = await db
    .select({ id: healthcareCaregiverConsent.id })
    .from(healthcareCaregiverConsent)
    .where(
      and(
        eq(healthcareCaregiverConsent.patient_id, scope.patientId),
        eq(healthcareCaregiverConsent.branch_id, scope.branchId),
        eq(healthcareCaregiverConsent.status, "Signed"),
      ),
    )
    .limit(1);
  if (!consent) {
    throw new Error(message);
  }
}

export async function assertTeleConsent(db: HealthcareDB, scope: PatientScope): Promise<void> {
  const rows = await db
    .select()
    .from(healthcareCaregiverConsent)
    .where(
      and(
        eq(healthcareCaregiverConsent.patient_id, scope.patientId),
        eq(healthcareCaregiverConsent.branch_id, scope.branchId),
        eq(healthcareCaregiverConsent.status, "Signed"),
      ),
    )
    .limit(10);
  const consented = rows.some((row) => /tele|general|counselling/i.test(row.scope));
  if (!consented) {
    throw new Error("Tele counselling needs a signed tele consent; record caregiver consent first");
  }
}
