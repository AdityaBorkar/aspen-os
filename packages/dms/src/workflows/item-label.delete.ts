import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsItemLabel, dmsLabel } from "../db-schemas";
import { WithIdSchema } from "./item-utils";

export const deleteItemLabel = Workflow.name("dms.label.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(dmsItemLabel).where(eq(dmsItemLabel.labelId, id));
    await ctx.db.delete(dmsLabel).where(eq(dmsLabel.id, id));
  });
