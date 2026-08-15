import { savedView } from "#/db-schemas/saved-view";
import { IdSchema, UpdateSavedViewSchema } from "#/types";
import { isSavedViewType } from "#/utils/constants";
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

    const { type } = patch;
    if (type !== undefined) {
      if (!isSavedViewType(type)) {
        throw new Error(`Invalid saved view type: ${type}`);
      }
    }

    const [updated] = await ctx.db
      .update(savedView)
      .set({
        filters: patch.filters,
        groupBy: patch.groupBy,
        isDefault: patch.isDefault,
        isShared: patch.isShared,
        name: patch.name,
        sort: patch.sort,
        type,
      })
      .where(eq(savedView.id, id))
      .returning();

    return updated;
  });
