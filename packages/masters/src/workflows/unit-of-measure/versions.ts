import { masterUomVersion } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";

export const listUnitOfMeasureVersions = Workflow.name("masters.unit-of-measure.versions")
  .input(WithIdSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(masterUomVersion)
        .where(eq(masterUomVersion.uom_id, input.id))
        .orderBy(desc(masterUomVersion.effective_from), desc(masterUomVersion.created_at))
        .limit(100),
    ),
  );
