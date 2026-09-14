import { healthcareFacility } from "#/db-schemas/facilities";
import { FacilityStatusQuerySchema } from "#/schemas/facilities";
import { toFacilityDto } from "#/workflow-steps/fetch-facility";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const StatusBoardInputSchema = object({ input: FacilityStatusQuerySchema });

export const facilityStatusBoard = Workflow.name("healthcare.facilities.status-board")
  .input(StatusBoardInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FacilityStatusQuerySchema, input);
    const rows = await ctx.step.run("query-status-board", async () =>
      ctx.db
        .select()
        .from(healthcareFacility)
        .where(eq(healthcareFacility.branch_id, parsed.branchId))
        .limit(200),
    );
    return {
      facilities: rows.map((row) => {
        const dto = toFacilityDto(row);
        return {
          category: dto.category,
          id: dto.id,
          name: dto.name,
          occupiedAt: dto.occupiedAt,
          occupiedNote: dto.occupiedNote,
          status: dto.status,
        };
      }),
    };
  });
