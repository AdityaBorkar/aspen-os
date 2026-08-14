import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { driveFile } from "../../db-schemas";
import { FileIdSchema } from "../utils";

export const fetchFileStep = WorkflowStep.name("fetch-file")
  .input(object({ id: FileIdSchema }))
  .handler(async (input, ctx) => {
    const [row] = await ctx.db.select().from(driveFile).where(eq(driveFile.id, input.id)).limit(1);
    if (!row) {
      throw new Error(`File with id "${input.id}" not found.`);
    }
    return row;
  });
