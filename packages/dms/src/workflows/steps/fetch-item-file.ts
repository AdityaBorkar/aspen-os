import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsFile } from "../../db-schemas";
import { FileIdSchema } from "../item-utils";

export const fetchItemFileStep = WorkflowStep.name("fetch-item-file")
  .input(object({ id: FileIdSchema }))
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(dmsFile)
      .where(eq(dmsFile.id, input.id))
      .limit(1);
    if (!row) throw new Error(`File with id "${input.id}" not found.`);
    return row;
  });
