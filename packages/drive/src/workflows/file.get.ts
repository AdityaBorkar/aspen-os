import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveFile } from "../db-schemas";
import { WithFileIdSchema } from "./utils";

const getFileById = Workflow.name("drive.file.get-by-id")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    const [file] = await ctx.db.select().from(driveFile).where(eq(driveFile.id, id)).limit(1);

    if (!file) {
      throw new Error(`File with id "${id}" not found.`);
    }

    return file;
  });

export const getFile = getFileById;
export { getFileById };
