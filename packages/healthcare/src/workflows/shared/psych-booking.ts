import type { healthcareRiskFlag } from "#/db-schemas/psych";
import { healthcareSafetyPlan } from "#/db-schemas/psych";

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

// D5 note: minor/tele consent gates were deleted with the consent stores.
// Booking flows proceed without a consent check; record any guardian or
// tele discussion in the session charting note instead of gating on it.
