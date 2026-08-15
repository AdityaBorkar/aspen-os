import { savedView } from "#/db-schemas/saved-view";
import { CreateSavedViewSchema } from "#/types";
import type { SavedViewType } from "#/utils/constants";
import { unsetDefaultSavedView } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({
  input: CreateSavedViewSchema,
});

export const createSavedView = Workflow.name("view.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.isDefault) {
      await unsetDefaultSavedView(ctx.db, input.ownerId, input.projectId ?? null);
    }

    const [result] = await ctx.db
      .insert(savedView)
      .values({
        filters: input.filters ?? null,
        groupBy: input.groupBy ?? null,
        isDefault: input.isDefault ?? false,
        isShared: input.isShared ?? false,
        name: input.name,
        ownerId: input.ownerId,
        projectId: input.projectId ?? null,
        sort: input.sort ?? null,
        type: (input.type ?? "list") as SavedViewType,
      })
      .returning();

    return result;
  });
