import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsFolder } from "../../db-schemas";
import { WithIdSchema } from "../item-utils";

export const fetchItemFolderStep = WorkflowStep.name("fetch-item-folder")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db.select().from(dmsFolder).where(eq(dmsFolder.id, input.id)).limit(1);
    if (!row) {
      throw new Error(`Folder with id "${input.id}" not found.`);
    }
    return row;
  });
