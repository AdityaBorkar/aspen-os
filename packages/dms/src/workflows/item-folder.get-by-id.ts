import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsFolder } from "../db-schemas";
import { WithIdSchema } from "./item-utils";

export const getItemFolderById = Workflow.name("dms.folder.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [folder] = await ctx.db
      .select()
      .from(dmsFolder)
      .where(eq(dmsFolder.id, id))
      .limit(1);
    if (!folder) throw new Error(`Folder with id "${id}" not found.`);
    return folder;
  });
