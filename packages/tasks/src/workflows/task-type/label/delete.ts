import { IdSchema } from "#/types";

import { masterEntityLabel, masterLabel } from "@aspen-os/masters";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const deleteLabel = Workflow.name("task-type.delete-label")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(masterEntityLabel).where(eq(masterEntityLabel.label_id, id));
    await ctx.db.delete(masterLabel).where(eq(masterLabel.id, id));
  });
