import { status } from "#/db-schemas/status";
import { CreateStatusSchema } from "#/types";
import { unsetDefaultProjectStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({
  input: CreateStatusSchema,
});

export const createStatus = Workflow.name("status.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.isDefault) {
      await unsetDefaultProjectStatus(ctx.db, input.projectId ?? null);
    }

    const [result] = await ctx.db
      .insert(status)
      .values({
        category: input.category,
        color: input.color ?? null,
        is_default: input.isDefault ?? false,
        is_resolved: input.isResolved ?? false,
        name: input.name,
        project_id: input.projectId ?? null,
        sort_order: input.sortOrder ?? 0,
      })
      .returning();

    return result;
  });
