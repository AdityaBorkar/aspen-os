import { status } from "#/db-schemas/status";
import { task } from "#/db-schemas/task";
import { taskAssignee } from "#/db-schemas/task-assignee";
import { TASK_EVENTS } from "#/pubsub";
import { IdSchema, UpdateTaskSchema } from "#/types";
import { STATUS_CATEGORY } from "#/utils/constants";
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
      input.patch.statusId !== undefined && input.patch.statusId !== current.status_id;

    const parentChanged = input.patch.parentId !== undefined && input.patch.parentId !== null;

    const [, transitionAllowed] = await Promise.all([
      parentChanged && input.patch.parentId
        ? validateParentTask(ctx.db, {
            currentTaskId: input.id,
            parentId: input.patch.parentId,
            projectId: current.project_id,
          })
        : Promise.resolve(),
      statusChanged && input.patch.statusId
        ? validateTransition.run({
            fromStatusId: current.status_id,
            projectId: current.project_id,
            toStatusId: input.patch.statusId,
          })
        : Promise.resolve(true),
    ]);

    if (statusChanged && input.patch.statusId) {
      if (!transitionAllowed) {
        throw new Error(
          `Transition from "${current.status_id}" to "${input.patch.statusId}" is not allowed.`,
        );
      }
      changes.status_id = { from: current.status_id, to: input.patch.statusId };
    }

    if (input.patch.title !== undefined && input.patch.title !== current.title) {
      changes.title = { from: current.title, to: input.patch.title };
    }

    const dueDateChanged =
      input.patch.dueDate !== undefined &&
      (input.patch.dueDate?.getTime() ?? null) !== (current.due_date?.getTime() ?? null);

    if (dueDateChanged) {
      changes.dueDate = {
        from: current.due_date ? current.due_date.toISOString() : null,
        to: input.patch.dueDate ? input.patch.dueDate.toISOString() : null,
      };
    }

    const [updated] = await ctx.db
      .update(task)
      .set({
        description: input.patch.description,
        due_date: input.patch.dueDate,
        estimated_hours: input.patch.estimatedHours?.toString(),
        labels: input.patch.labels,
        parent_id: input.patch.parentId,
        priority: input.patch.priority,
        start_date: input.patch.startDate,
        status_id: input.patch.statusId,
        title: input.patch.title,
        type_id: input.patch.typeId,
        updated_at: new Date(),
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
      userId: current.reporter_id,
    });

    await ctx.step.run("notify", async () => {
      const notifications: Promise<string | null>[] = [
        ctx.pubsub.publish(TASK_EVENTS.UPDATED, {
          changes,
          task: { id: updated.id, title: updated.title },
        }),
      ];

      if (statusChanged && input.patch.statusId) {
        const [nextStatus] = await ctx.db
          .select({ category: status.category })
          .from(status)
          .where(eq(status.id, input.patch.statusId))
          .limit(1);
        const toStatusCategory = nextStatus?.category ?? null;
        notifications.push(
          ctx.pubsub.publish(TASK_EVENTS.STATUS_CHANGED, {
            fromStatus: current.status_id,
            isTerminal:
              toStatusCategory === STATUS_CATEGORY.COMPLETED ||
              toStatusCategory === STATUS_CATEGORY.CANCELLED,
            task: { id: updated.id, title: updated.title },
            toStatus: input.patch.statusId,
            toStatusCategory,
          }),
        );
      }

      if (dueDateChanged) {
        notifications.push(
          (async () => {
            const assignees = await ctx.db
              .select({ userId: taskAssignee.user_id })
              .from(taskAssignee)
              .where(eq(taskAssignee.task_id, input.id));

            const userIds = [
              ...new Set([current.reporter_id, ...assignees.map((assignee) => assignee.userId)]),
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
