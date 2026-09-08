import { dmsEntityLabel } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { masterLabel } from "@aspen-os/masters";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deleteLabel = Workflow.name("dms.label.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(dmsEntityLabel).where(eq(dmsEntityLabel.label_id, id));
    await ctx.db.delete(masterLabel).where(eq(masterLabel.id, id));
  });
