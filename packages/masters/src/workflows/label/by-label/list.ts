import { masterEntityLabel } from "#/db-schemas";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const listEntitiesByLabel = Workflow.name("masters.label.list-by-label")
  .input(object({ labelId: IdSchema }))
  .handler(async ({ labelId }, ctx) =>
    ctx.step.run("query", async () => {
      const rows = await ctx.db
        .select({
          entityId: masterEntityLabel.entity_id,
          entityType: masterEntityLabel.entity_type,
        })
        .from(masterEntityLabel)
        .where(eq(masterEntityLabel.label_id, labelId))
        .limit(50);

      return rows;
    }),
  );
