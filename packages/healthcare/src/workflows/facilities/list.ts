import { healthcareFacility } from "#/db-schemas/facilities";
import { FacilityFiltersSchema } from "#/schemas/facilities";
import { toFacilityDto } from "#/workflow-steps/fetch-facility";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const ListFacilitiesInputSchema = object({ input: FacilityFiltersSchema });

export const listFacilities = Workflow.name("healthcare.facilities.list")
  .input(ListFacilitiesInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FacilityFiltersSchema, input);
    const limit = parsed.limit ?? 100;
    const offset = parsed.offset ?? 0;
    const rows = await ctx.step.run("query-facilities", async () => {
      const conditions: SQL[] = [eq(healthcareFacility.branch_id, parsed.branchId)];
      if (parsed.category) {
        conditions.push(eq(healthcareFacility.category, parsed.category));
      }
      if (parsed.status) {
        conditions.push(eq(healthcareFacility.status, parsed.status));
      }
      if (parsed.search) {
        const match = `%${parsed.search}%`;
        const textMatch = or(
          ilike(healthcareFacility.name, match),
          ilike(healthcareFacility.code, match),
        );
        if (textMatch) {
          conditions.push(textMatch);
        }
      }
      return ctx.db
        .select()
        .from(healthcareFacility)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset);
    });
    return {
      items: rows.map(toFacilityDto),
      limit,
      offset,
    };
  });
