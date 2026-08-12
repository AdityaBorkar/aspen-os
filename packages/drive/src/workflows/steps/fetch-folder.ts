import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveFolder } from "../../db-schemas";
import { WithIdSchema } from "../utils";

export const fetchFolderStep = WorkflowStep.name("fetch-folder")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(driveFolder)
      .where(eq(driveFolder.id, input.id))
      .limit(1);
    if (!row) throw new Error(`Folder with id "${input.id}" not found.`);
    return row;
  });
