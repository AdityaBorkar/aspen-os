import { task } from "#/db-schemas/task";
import { taskAssignee } from "#/db-schemas/task-assignee";
import { TASK_EVENTS } from "#/pubsub";
import { IdSchema, UpdateTaskSchema } from "#/types";
import { fetchTaskStep } from "#/workflow-steps/fetch-task";
import { validateTransition } from "#/workflows/status/transition/validate";
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

    if (input.patch.parentId === input.id) {
      throw new Error("A task cannot be its own parent.");
    }

    const changes: Record<string, JsonValue> = {};

    const statusChanged =
      input.patch.statusId !== undefined && input.patch.statusId !== current.statusId;

    const parentChanged = input.patch.parentId !== undefined && input.patch.parentId !== null;

    const [, transitionAllowed] = await Promise.all([
      parentChanged && input.patch.parentId
        ? validateParentTask(ctx.db, {
            currentTaskId: input.id,
            parentId: input.patch.parentId,
            projectId: current.projectId,
          })
        : Promise.resolve(),
      statusChanged && input.patch.statusId
        ? validateTransition.run({
            fromStatusId: current.statusId,
            projectId: current.projectId,
            toStatusId: input.patch.statusId,
          })
        : Promise.resolve(true),
    ]);

    if (statusChanged && input.patch.statusId) {
      if (!transitionAllowed) {
        throw new Error(
          `Transition from "${current.statusId}" to "${input.patch.statusId}" is not allowed.`,
        );
      }
      changes.statusId = { from: current.statusId, to: input.patch.statusId };
    }

    if (input.patch.title !== undefined && input.patch.title !== current.title) {
      changes.title = { from: current.title, to: input.patch.title };
    }

    const dueDateChanged =
      input.patch.dueDate !== undefined &&
      (input.patch.dueDate?.getTime() ?? null) !== (current.dueDate?.getTime() ?? null);

    if (dueDateChanged) {
      changes.dueDate = {
        from: current.dueDate ? current.dueDate.toISOString() : null,
        to: input.patch.dueDate ? input.patch.dueDate.toISOString() : null,
      };
    }

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

    await addActivity(ctx.db, {
      action: statusChanged ? "status_changed" : "task_updated",
      newValue: changes,
      oldValue: null,
      taskId: input.id,
      userId: current.reporterId,
    });

    await ctx.step.run("notify", async () => {
      const notifications: Promise<string | null>[] = [
        ctx.pubsub.publish(TASK_EVENTS.UPDATED, {
          changes,
          task: { id: updated.id, title: updated.title },
        }),
      ];

      if (statusChanged && input.patch.statusId) {
        notifications.push(
          ctx.pubsub.publish(TASK_EVENTS.STATUS_CHANGED, {
            fromStatus: current.statusId,
            task: { id: updated.id, title: updated.title },
            toStatus: input.patch.statusId,
          }),
        );
      }

      if (dueDateChanged) {
        notifications.push(
          (async () => {
            const assignees = await ctx.db
              .select({ userId: taskAssignee.userId })
              .from(taskAssignee)
              .where(eq(taskAssignee.taskId, input.id));

            const userIds = [
              ...new Set([current.reporterId, ...assignees.map((assignee) => assignee.userId)]),
            ];

            return ctx.pubsub.publish(TASK_EVENTS.DUE_DATE_CHANGED, {
              dueDate: input.patch.dueDate ? input.patch.dueDate.toISOString() : null,
              taskId: updated.id,
              userIds,
            });
          })(),
        );
      }

      await Promise.all(notifications);
    });

    return updated;
  });
