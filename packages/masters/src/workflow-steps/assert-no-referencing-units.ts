import { masterUnitOfMeasure } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const assertNoReferencingUnitsStep = WorkflowStep.name("masters-assert-uom-no-references")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [referencing] = await ctx.db
      .select({ id: masterUnitOfMeasure.id, name: masterUnitOfMeasure.name })
      .from(masterUnitOfMeasure)
      .where(eq(masterUnitOfMeasure.baseUnitId, input.id))
      .limit(1);

    if (referencing) {
      throw new Error(
        `Unit of measure is referenced as the base unit by "${referencing.name}" and cannot be deleted.`,
      );
    }
  });
