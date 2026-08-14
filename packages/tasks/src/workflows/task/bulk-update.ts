import { Workflow } from "@aspen-os/platform/server";
import { inArray } from "drizzle-orm";
import { object } from "valibot";

import { task } from "../../db-schemas/task";
import { BulkUpdateTaskSchema } from "../../types";

const BulkUpdateInputSchema = object({
  input: BulkUpdateTaskSchema,
});

export const bulkUpdateTask = Workflow.name("task.bulk-update")
  .input(BulkUpdateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [updated] = await ctx.db
      .update(task)
      .set({
        ...input.patch,
        estimatedHours: input.patch.estimatedHours?.toString(),
        updatedAt: new Date(),
      })
      .where(inArray(task.id, input.ids))
      .returning();
    return updated;
  });
