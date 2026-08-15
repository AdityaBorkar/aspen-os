import { label } from "#/db-schemas/label";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const deleteLabel = Workflow.name("task-type.delete-label")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(label).where(eq(label.id, id));
  });
