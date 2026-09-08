import { task } from "#/db-schemas/task";
import { TASK_EVENTS } from "#/pubsub";
import { CreateTaskSchema } from "#/types";
import { addActivity, generateTaskNumber, validateParentTask } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({
  input: CreateTaskSchema,
});

export const createTask = Workflow.name("task.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.parentId) {
      await validateParentTask(ctx.db, {
        currentTaskId: undefined,
        parentId: input.parentId,
        projectId: input.projectId,
      });
    }

    const { displayNumber, taskSeq } = await generateTaskNumber(ctx.db, input.projectId);

    const [result] = await ctx.db
      .insert(task)
      .values({
        description: input.description ?? null,
        due_date: input.dueDate ?? null,
        estimated_hours: input.estimatedHours?.toString() ?? null,
        labels: input.labels ?? [],
        number: displayNumber,
        parent_id: input.parentId ?? null,
        priority: input.priority ?? "none",
        project_id: input.projectId,
        reporter_id: input.reporterId,
        start_date: input.startDate ?? null,
        status_id: input.statusId,
        task_number: taskSeq,
        title: input.title,
        type_id: input.typeId ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create task.");
    }

    await addActivity(ctx.db, {
      action: "task_created",
      newValue: {
        id: result.id,
        title: result.title,
      },
      oldValue: null,
      taskId: result.id,
      userId: result.reporter_id,
    });

    await ctx.step.run("notify", async () => {
      const notifications: Promise<string | null>[] = [
        ctx.pubsub.publish(TASK_EVENTS.CREATED, {
          due_date: result.due_date ? result.due_date.toISOString() : null,
          task: {
            id: result.id,
            number: result.number,
            projectId: result.project_id,
            title: result.title,
          },
        }),
      ];

      if (result.due_date) {
        notifications.push(
          ctx.pubsub.publish(TASK_EVENTS.DUE_DATE_CHANGED, {
            dueDate: result.due_date.toISOString(),
            taskId: result.id,
            // Assignees cannot exist yet at creation time (assignment is a
            // separate workflow), so only the reporter is notified here.
            userIds: [result.reporter_id],
          }),
        );
      }

      await Promise.all(notifications);
    });

    return result;
  });
