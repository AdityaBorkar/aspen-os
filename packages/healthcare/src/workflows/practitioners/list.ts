import { healthcarePractitioner } from "#/db-schemas/practitioners";
import { PractitionerFiltersSchema } from "#/schemas/practitioners";
import { toPractitionerDto } from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const ListPractitionersInputSchema = object({ input: PractitionerFiltersSchema });

export const listPractitioners = Workflow.name("healthcare.practitioners.list")
  .input(ListPractitionersInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PractitionerFiltersSchema, input);
    const limit = parsed.limit ?? 100;
    const offset = parsed.offset ?? 0;
    const rows = await ctx.step.run("query-practitioners", async () => {
      const conditions: SQL[] = [eq(healthcarePractitioner.branch_id, parsed.branchId)];
      if (parsed.specialty) {
        conditions.push(eq(healthcarePractitioner.specialty, parsed.specialty));
      }
      if (parsed.status) {
        conditions.push(eq(healthcarePractitioner.status, parsed.status));
      }
      if (parsed.search) {
        const nameMatch = `%${parsed.search}%`;
        const textMatch = or(
          ilike(healthcarePractitioner.name, nameMatch),
          ilike(healthcarePractitioner.specialty, nameMatch),
          sql`exists (select 1 from unnest(${healthcarePractitioner.languages}) as lang where lang ilike ${nameMatch})`,
        );
        if (textMatch) {
          conditions.push(textMatch);
        }
      }
      return ctx.db
        .select()
        .from(healthcarePractitioner)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset);
    });
    return {
      items: rows.map(toPractitionerDto),
      limit,
      offset,
    };
  });
