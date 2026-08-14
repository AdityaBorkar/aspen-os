import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";

import { dmsFile, dmsFileVersion } from "../db-schemas";
import { WithFileIdSchema } from "./item-utils";

export const listItemFileVersions = Workflow.name("dms.file.list-versions")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select({ id: dmsFile.id })
        .from(dmsFile)
        .where(eq(dmsFile.id, id))
        .limit(1);
      if (!row) {
        throw new Error(`File with id "${id}" not found.`);
      }
      return row;
    });

    return ctx.db
      .select()
      .from(dmsFileVersion)
      .where(eq(dmsFileVersion.fileId, id))
      .orderBy(desc(dmsFileVersion.version));
  });
