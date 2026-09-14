import { healthcareMergeRequest, healthcarePatient } from "#/db-schemas/patient";
import type { HealthcareMergeRequest, HealthcarePatient } from "#/db-schemas/patient";
import { IdSchema } from "#/schemas/utils";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const FetchInputSchema = object({ id: IdSchema });

export const fetchPatientStep = WorkflowStep.name("healthcare-fetch-patient")
  .input(FetchInputSchema)
  .handler(async (input, ctx): Promise<HealthcarePatient> => {
    const [row] = await ctx.db
      .select()
      .from(healthcarePatient)
      .where(eq(healthcarePatient.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Patient "${input.id}" not found; check the UHID and retry.`);
    }
    return row;
  });

export const fetchMergeRequestStep = WorkflowStep.name("healthcare-fetch-merge-request")
  .input(FetchInputSchema)
  .handler(async (input, ctx): Promise<HealthcareMergeRequest> => {
    const [row] = await ctx.db
      .select()
      .from(healthcareMergeRequest)
      .where(eq(healthcareMergeRequest.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Merge request "${input.id}" not found; check the ID and retry.`);
    }
    return row;
  });

export function toPatientDto(row: HealthcarePatient) {
  return {
    abha: row.abha,
    // SAFETY: payload.allergies is written only from RegisterPatientSchema-validated string[] (see register workflow).
    allergies: (row.payload.allergies as string[] | undefined) ?? [],
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    dob: row.dob,
    fullName: row.full_name,
    gender: row.gender,
    guardian: row.guardian,
    id: row.id,
    language: row.language,
    mergedInto: row.merged_into,
    phone: row.phone,
    status: row.status,
    uhid: row.uhid,
    updatedAt: row.updated_at.toISOString(),
  };
}
