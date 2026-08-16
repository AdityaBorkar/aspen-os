import { task } from "#/db-schemas/task";
import { publishTaskCreated, publishTaskDueDateChanged } from "#/services/notification-bridge";
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
        dueDate: input.dueDate ?? null,
        estimatedHours: input.estimatedHours?.toString() ?? null,
        labels: input.labels ?? [],
        number: displayNumber,
        parentId: input.parentId ?? null,
        priority: input.priority ?? "none",
        projectId: input.projectId,
        reporterId: input.reporterId,
        startDate: input.startDate ?? null,
        statusId: input.statusId,
        taskNumber: taskSeq,
        title: input.title,
        typeId: input.typeId ?? null,
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
      userId: result.reporterId,
    });

    await ctx.step.run("notify", async () => {
      await publishTaskCreated(
        {
          dueDate: result.dueDate ? result.dueDate.toISOString() : null,
          task: {
            id: result.id,
            number: result.number,
            projectId: result.projectId,
            title: result.title,
          },
        },
        { pubsub: ctx.pubsub },
      );

      if (result.dueDate) {
        await publishTaskDueDateChanged(
          {
            dueDate: result.dueDate.toISOString(),
            taskId: result.id,
            userIds: [result.reporterId],
          },
          { pubsub: ctx.pubsub },
        );
      }
    });

    return result;
  });
