import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveFolder } from "../db-schemas";
import { WithIdSchema } from "./utils";

export const getFolderById = Workflow.name("drive.folder.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [folder] = await ctx.db.select().from(driveFolder).where(eq(driveFolder.id, id)).limit(1);
    if (!folder) {
      throw new Error(`Folder with id "${id}" not found.`);
    }
    return folder;
  });
