import { task } from "#/db-schemas/task";
import { IdSchema, UpdateTaskSchema } from "#/types";
import { fetchTaskStep } from "#/workflow-steps/fetch-task";
import { addActivity, validateParentTask } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

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
        await validateParentTask(ctx.db, {
          currentTaskId: input.id,
          parentId: input.patch.parentId,
          projectId: current.projectId,
        });
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
      await addActivity(ctx.db, {
        action: "status_changed",
        newValue: { to: input.patch.statusId },
        oldValue: { from: current.statusId },
        taskId: input.id,
        userId: current.reporterId,
      });
    }

    if (input.patch.title && input.patch.title !== current.title) {
      changes.title = { from: current.title, to: input.patch.title };
    }

    await addActivity(ctx.db, {
      action: "task_updated",
      newValue: changes,
      oldValue: current,
      taskId: input.id,
      userId: current.reporterId,
    });

    return updated;
  });
