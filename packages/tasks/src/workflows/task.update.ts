import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { task } from "../db-schemas/task";
import { IdSchema, UpdateTaskSchema } from "../types";
import { fetchTaskStep } from "./steps/fetch-task";
import { addActivity, validateParentTask } from "./utils";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateTaskSchema,
});

export const updateTask = Workflow.name("task.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchTaskStep, { id: input.id });

    if (input.patch.parentId !== undefined) {
      if (input.patch.parentId !== null) {
        if (input.patch.parentId === input.id) {
          throw new Error("A task cannot be its own parent.");
        }
        await validateParentTask(ctx.db, input.patch.parentId, current.projectId, input.id);
      }
    }

    const changes: Record<string, unknown> = {};

    const [updated] = await ctx.db
      .update(task)
      .set({
        description: input.patch.description,
        dueDate: input.patch.dueDate,
        estimatedHours: input.patch.estimatedHours?.toString(),
        labels: input.patch.labels,
        parentId: input.patch.parentId,
        priority: input.patch.priority,
        startDate: input.patch.startDate,
        statusId: input.patch.statusId,
        title: input.patch.title,
        typeId: input.patch.typeId,
        updatedAt: new Date(),
      })
      .where(eq(task.id, input.id))
      .returning();

    if (input.patch.statusId && input.patch.statusId !== current.statusId) {
      changes.statusId = { from: current.statusId, to: input.patch.statusId };
      await addActivity(
        ctx.db,
        input.id,
        current.reporterId,
        "status_changed",
        { from: current.statusId },
        { to: input.patch.statusId },
      );
    }

    if (input.patch.title && input.patch.title !== current.title) {
      changes.title = { from: current.title, to: input.patch.title };
    }

    await addActivity(ctx.db, input.id, current.reporterId, "task_updated", current, changes);

    return updated;
  });
