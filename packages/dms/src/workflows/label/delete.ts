import { dmsEntityLabel, dmsLabel } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deleteLabel = Workflow.name("dms.label.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(dmsEntityLabel).where(eq(dmsEntityLabel.labelId, id));
    await ctx.db.delete(dmsLabel).where(eq(dmsLabel.id, id));
  });
