import { healthcarePatient } from "#/db-schemas/patient";
import { PatientFiltersSchema } from "#/schemas/patients";
import { toPatientDto } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, like } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: PatientFiltersSchema });

export const listPatients = Workflow.name("healthcare.patients.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PatientFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const limit = parsed.limit ?? 100;
    const offset = parsed.offset ?? 0;

    const filters = [eq(healthcarePatient.branch_id, branchId)];
    if (parsed.phone) {
      filters.push(like(healthcarePatient.phone, `%${parsed.phone}%`));
    }
    if (parsed.name) {
      filters.push(like(healthcarePatient.full_name, `%${parsed.name}%`));
    }

    const rows = await ctx.step.run("list-patients", async () =>
      ctx.db
        .select()
        .from(healthcarePatient)
        .where(and(...filters))
        .limit(limit)
        .offset(offset),
    );
    return rows.map(toPatientDto);
  });
