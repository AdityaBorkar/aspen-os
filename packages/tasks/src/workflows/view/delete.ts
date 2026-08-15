import { savedView } from "#/db-schemas/saved-view";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const deleteSavedView = Workflow.name("view.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(savedView).where(eq(savedView.id, id));
  });
