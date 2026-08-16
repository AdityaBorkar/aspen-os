import { masterUnitOfMeasure } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchUnitOfMeasureStep = WorkflowStep.name("masters-fetch-unit-of-measure")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(masterUnitOfMeasure)
      .where(eq(masterUnitOfMeasure.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Unit of measure with id "${input.id}" not found.`);
    }

    return result;
  });
