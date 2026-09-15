import { masterUomAlias, masterUomVersion } from "#/db-schemas";
import { WithIdSchema } from "#/types";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";

export const getUnitOfMeasure = Workflow.name("masters.unit-of-measure.get")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const unit = await ctx.step.run(fetchUnitOfMeasureStep, { id: input.id });
    const [versions, aliases] = await ctx.step.run("fetch-history", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(masterUomVersion)
          .where(eq(masterUomVersion.uom_id, input.id))
          .orderBy(desc(masterUomVersion.effective_from), desc(masterUomVersion.created_at))
          .limit(100),
        ctx.db.select().from(masterUomAlias).where(eq(masterUomAlias.uom_id, input.id)).limit(50),
      ]),
    );
    return { aliases, unit, versions };
  });
