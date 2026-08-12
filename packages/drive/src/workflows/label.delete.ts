import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveItemLabel, driveLabel } from "../db-schemas";
import { WithIdSchema } from "./utils";

export const deleteLabel = Workflow.name("drive.label.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(driveItemLabel).where(eq(driveItemLabel.labelId, id));
    await ctx.db.delete(driveLabel).where(eq(driveLabel.id, id));
  });
