import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsFileView } from "../db-schemas";
import { IdSchema } from "../types";

export const fetchFileViewStep = WorkflowStep.name("dms-fetch-file-view")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [view] = await ctx.db
      .select()
      .from(dmsFileView)
      .where(eq(dmsFileView.id, input.id))
      .limit(1);

    if (!view) {
      throw new Error(`File view with id "${input.id}" not found.`);
    }
    return view;
  });
