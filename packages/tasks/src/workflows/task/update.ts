import { task } from "#/db-schemas/task";
import { taskAssignee } from "#/db-schemas/task-assignee";
import {
  publishTaskDueDateChanged,
  publishTaskStatusChanged,
  publishTaskUpdated,
} from "#/services/notification-bridge";
import { IdSchema, UpdateTaskSchema } from "#/types";
import { fetchTaskStep } from "#/workflow-steps/fetch-task";
import { addActivity, validateParentTask } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
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

    const changes: Record<string, JsonValue> = {};

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

    if (!updated) {
      throw new Error(`Task with id "${input.id}" not found.`);
    }

    const statusChanged =
      input.patch.statusId !== undefined && input.patch.statusId !== current.statusId;

    if (statusChanged) {
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

    await ctx.step.run("notify", async () => {
      await publishTaskUpdated(
        {
          changes,
          task: {
            id: updated.id,
            title: updated.title,
          },
        },
        { pubsub: ctx.pubsub },
      );

      if (statusChanged && input.patch.statusId) {
        await publishTaskStatusChanged(
          {
            fromStatus: current.statusId,
            task: {
              id: updated.id,
              title: updated.title,
            },
            toStatus: input.patch.statusId,
          },
          { pubsub: ctx.pubsub },
        );
      }

      const dueDateChanged =
        input.patch.dueDate !== undefined &&
        (input.patch.dueDate?.getTime() ?? null) !== (current.dueDate?.getTime() ?? null);

      if (dueDateChanged) {
        const assignees = await ctx.db
          .select({ userId: taskAssignee.userId })
          .from(taskAssignee)
          .where(eq(taskAssignee.taskId, input.id));

        const userIds = [
          ...new Set([current.reporterId, ...assignees.map((assignee) => assignee.userId)]),
        ];

        await publishTaskDueDateChanged(
          {
            dueDate: input.patch.dueDate ? input.patch.dueDate.toISOString() : null,
            taskId: updated.id,
            userIds,
          },
          { pubsub: ctx.pubsub },
        );
      }
    });

    return updated;
  });
