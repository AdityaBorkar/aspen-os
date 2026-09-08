import { savedView } from "#/db-schemas/saved-view";
import { CreateSavedViewSchema } from "#/types";
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
        group_by: input.groupBy ?? null,
        is_default: input.isDefault ?? false,
        is_shared: input.isShared ?? false,
        name: input.name,
        owner_id: input.ownerId,
        project_id: input.projectId ?? null,
        sort: input.sort ?? null,
        type: input.type ?? "list",
      })
      .returning();

    return result;
  });
