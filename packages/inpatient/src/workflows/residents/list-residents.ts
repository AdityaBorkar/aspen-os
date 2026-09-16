import { healthcareResident } from "#/db-schemas/residents";
import { ResidentListSchema } from "#/schemas/residents";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListResidentsInputSchema = object({ input: ResidentListSchema });

export const listResidents = Workflow.name("inpatient.residents.list-residents")
  .input(ListResidentsInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResidentListSchema, input);
    const rows = await ctx.step.run("list-residents", async () =>
      ctx.db
        .select()
        .from(healthcareResident)
        .where(eq(healthcareResident.branch_id, parsed.branchId ?? "main"))
        .limit(parsed.limit ?? 100),
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      uhid: row.uhid,
    }));
  });
