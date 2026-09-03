import { savedView } from "#/db-schemas/saved-view";
import { IdSchema } from "#/types";
import { requireRow } from "#/workflows/utils";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchSavedViewStep = WorkflowStep.name("fetch-saved-view")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const rows = await ctx.db.select().from(savedView).where(eq(savedView.id, input.id)).limit(1);

    return requireRow(rows, "Saved view", input.id);
  });
