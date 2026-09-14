import { healthcareFacilityBlock } from "#/db-schemas/facilities";
import { FacilityOverlapQuerySchema } from "#/schemas/facilities";
import { fetchFacilityStep, toFacilityBlockDto } from "#/workflow-steps/fetch-facility";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, lte, gte } from "drizzle-orm";
import { object, parse } from "valibot";

const OverlapInputSchema = object({ input: FacilityOverlapQuerySchema });

export const checkFacilityOverlap = Workflow.name("healthcare.facilities.overlap")
  .input(OverlapInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FacilityOverlapQuerySchema, input);
    const fromAt = new Date(parsed.from);
    const toAt = new Date(parsed.to);
    if (Number.isNaN(fromAt.getTime()) || Number.isNaN(toAt.getTime())) {
      throw new Error("Overlap range must be valid datetimes.");
    }
    if (toAt <= fromAt) {
      throw new Error(`Range end (${parsed.to}) must be after start (${parsed.from}).`);
    }
    await ctx.step.run(fetchFacilityStep, { id: parsed.facilityId });
    const blocks = await ctx.step.run("query-overlap", async () =>
      ctx.db
        .select()
        .from(healthcareFacilityBlock)
        .where(
          and(
            eq(healthcareFacilityBlock.branch_id, parsed.branchId),
            eq(healthcareFacilityBlock.facility_id, parsed.facilityId),
            lte(healthcareFacilityBlock.from_at, toAt),
            gte(healthcareFacilityBlock.to_at, fromAt),
          ),
        )
        .limit(200),
    );
    return {
      blocks: blocks.map(toFacilityBlockDto),
      facilityId: parsed.facilityId,
      from: parsed.from,
      hasOverlap: blocks.length > 0,
      to: parsed.to,
    };
  });
