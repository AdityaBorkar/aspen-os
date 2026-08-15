import { savedView } from "#/db-schemas/saved-view";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchSavedViewStep = WorkflowStep.name("fetch-saved-view")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(savedView)
      .where(eq(savedView.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Saved view with id "${input.id}" not found.`);
    }

    return result;
  });
