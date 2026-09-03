import { task } from "#/db-schemas/task";
import { BulkUpdateTaskSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { inArray } from "drizzle-orm";
import { object } from "valibot";

const BulkUpdateInputSchema = object({
  input: BulkUpdateTaskSchema,
});

export const bulkUpdateTask = Workflow.name("task.bulk-update")
  .input(BulkUpdateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.patch.statusId !== undefined) {
      throw new Error("Bulk update cannot change statusId; update tasks individually.");
    }
    if (input.patch.parentId !== undefined) {
      throw new Error("Bulk update cannot change parentId; update tasks individually.");
    }
    return ctx.db
      .update(task)
      .set({
        description: input.patch.description,
        dueDate: input.patch.dueDate,
        estimatedHours: input.patch.estimatedHours?.toString(),
        labels: input.patch.labels,
        priority: input.patch.priority,
        startDate: input.patch.startDate,
        title: input.patch.title,
        typeId: input.patch.typeId,
        updatedAt: new Date(),
      })
      .where(inArray(task.id, input.ids))
      .returning();
  });
