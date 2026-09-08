import { taskAssignee } from "#/db-schemas/task-assignee";
import { TASK_EVENTS } from "#/pubsub";
import { AssignTaskSchema } from "#/types";
import { fetchTaskStep } from "#/workflow-steps/fetch-task";
import { addActivity, ensureWatcher, unsetLeadAssignee } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const AssignInputSchema = object({
  input: AssignTaskSchema,
});

export const assignTask = Workflow.name("task.assign")
  .input(AssignInputSchema)
  .handler(async ({ input }, ctx) => {
    await ctx.step.run(fetchTaskStep, { id: input.taskId });

    const [result] = await ctx.db.transaction(async (tx) => {
      if (input.isLead) {
        await unsetLeadAssignee(tx, input.taskId);
      }

      const inserted = await tx
        .insert(taskAssignee)
        .values({
          assigned_by: input.assignedBy,
          is_lead: input.isLead ?? false,
          task_id: input.taskId,
          user_id: input.userId,
        })
        .returning();

      await Promise.all([
        ensureWatcher(tx, input.taskId, input.userId),
        addActivity(tx, {
          action: "assignee_added",
          newValue: {
            userId: input.userId,
          },
          oldValue: null,
          taskId: input.taskId,
          userId: input.assignedBy,
        }),
      ]);

      return inserted;
    });

    await ctx.step.run("notify", async () => {
      await ctx.pubsub.publish(TASK_EVENTS.ASSIGNED, {
        assignedBy: input.assignedBy,
        taskId: input.taskId,
        userId: input.userId,
      });
    });

    return result;
  });
