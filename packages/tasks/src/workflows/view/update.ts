import { savedView } from "#/db-schemas/saved-view";
import { IdSchema, UpdateSavedViewSchema } from "#/types";
import { fetchSavedViewStep } from "#/workflow-steps/fetch-saved-view";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateSavedViewSchema,
});

export const updateSavedView = Workflow.name("view.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    await ctx.step.run(fetchSavedViewStep, { id });

    const [updated] = await ctx.db
      .update(savedView)
      .set({
        filters: patch.filters,
        group_by: patch.groupBy,
        is_default: patch.isDefault,
        is_shared: patch.isShared,
        name: patch.name,
        sort: patch.sort,
        type: patch.type,
      })
      .where(eq(savedView.id, id))
      .returning();

    return updated;
  });
