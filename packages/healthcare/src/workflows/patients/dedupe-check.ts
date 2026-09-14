import { healthcarePatient } from "#/db-schemas/patient";
import { DedupeCheckSchema } from "#/schemas/patients";
import { toPatientDto } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const DedupeCheckInputSchema = object({ input: DedupeCheckSchema });

export const dedupeCheckPatients = Workflow.name("healthcare.patients.dedupe-check")
  .input(DedupeCheckInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DedupeCheckSchema, input);
    const branchId = parsed.branchId ?? "main";
    if (!parsed.phone && !parsed.abha) {
      return [];
    }
    const conditions: SQL[] = [];
    if (parsed.phone) {
      conditions.push(eq(healthcarePatient.phone, parsed.phone));
    }
    if (parsed.abha) {
      conditions.push(eq(healthcarePatient.abha, parsed.abha));
    }
    const rows = await ctx.step.run("find-duplicates", async () =>
      ctx.db
        .select()
        .from(healthcarePatient)
        .where(
          and(
            eq(healthcarePatient.branch_id, branchId),
            isNull(healthcarePatient.merged_into),
            or(...conditions),
          ),
        )
        .limit(20),
    );
    return rows.map(toPatientDto);
  });
