import { healthcareFacilityBlock, healthcareSterilizationLog } from "#/db-schemas/facilities";
import { FacilityIdSchema } from "#/schemas/facilities";
import {
  fetchFacilityStep,
  toFacilityBlockDto,
  toFacilityDto,
  toSterilizationLogDto,
} from "#/workflow-steps/fetch-facility";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const GetFacilityInputSchema = object({ input: FacilityIdSchema });

export const getFacility = Workflow.name("healthcare.facilities.get")
  .input(GetFacilityInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FacilityIdSchema, input);
    const facility = await ctx.step.run(fetchFacilityStep, { id: parsed.id });
    const [blocks, sterilizationLogs] = await ctx.step.run("fetch-aggregate", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareFacilityBlock)
          .where(eq(healthcareFacilityBlock.facility_id, parsed.id))
          .orderBy(desc(healthcareFacilityBlock.from_at))
          .limit(100),
        ctx.db
          .select()
          .from(healthcareSterilizationLog)
          .where(eq(healthcareSterilizationLog.facility_id, parsed.id))
          .orderBy(desc(healthcareSterilizationLog.at))
          .limit(100),
      ]),
    );
    return {
      blocks: blocks.map(toFacilityBlockDto),
      facility: toFacilityDto(facility),
      sterilizationLogs: sterilizationLogs.map(toSterilizationLogDto),
    };
  });
