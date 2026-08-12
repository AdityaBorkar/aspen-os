import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";

import { driveFile, driveFileVersion } from "../db-schemas";
import { WithFileIdSchema } from "./utils";

export const listFileVersions = Workflow.name("drive.file.list-versions")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select({ id: driveFile.id })
        .from(driveFile)
        .where(eq(driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });

    return ctx.db
      .select()
      .from(driveFileVersion)
      .where(eq(driveFileVersion.fileId, id))
      .orderBy(desc(driveFileVersion.version));
  });
