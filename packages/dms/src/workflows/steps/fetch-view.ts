import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsView } from "../../db-schemas";
import { IdSchema } from "../../types";

export const fetchViewStep = WorkflowStep.name("dms-fetch-view")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [view] = await ctx.db.select().from(dmsView).where(eq(dmsView.id, input.id)).limit(1);

    if (!view) {
      throw new Error(`View with id "${input.id}" not found.`);
    }
    return view;
  });
