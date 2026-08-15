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
        isDefault: input.isDefault ?? false,
        isResolved: input.isResolved ?? false,
        name: input.name,
        projectId: input.projectId ?? null,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();

    return result;
  });
