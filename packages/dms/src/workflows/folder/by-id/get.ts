import { dmsFolder } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const getFolderById = Workflow.name("dms.folder.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [row] = await ctx.db.select().from(dmsFolder).where(eq(dmsFolder.id, id)).limit(1);
    if (!row) {
      throw new Error(`Folder with id "${id}" not found.`);
    }
    return row;
  });
