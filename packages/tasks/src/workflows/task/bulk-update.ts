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
    // Fast path: statusId/parentId changes require per-task validation
    // (transition rules, hierarchy checks), so they are rejected here.
    // This path emits no activity entries: the input carries no actor and
    // the update applies to many rows in a single statement.
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
        due_date: input.patch.dueDate,
        estimated_hours: input.patch.estimatedHours?.toString(),
        labels: input.patch.labels,
        priority: input.patch.priority,
        start_date: input.patch.startDate,
        title: input.patch.title,
        type_id: input.patch.typeId,
        updated_at: new Date(),
      })
      .where(inArray(task.id, input.ids))
      .returning();
  });
