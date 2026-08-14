import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { taskAssignee } from "../db-schemas/task-assignee";
import { AssignTaskSchema } from "../types";
import { fetchTaskStep } from "../workflow-steps/fetch-task";
import { addActivity, ensureWatcher, unsetLeadAssignee } from "./utils";

const AssignInputSchema = object({
  input: AssignTaskSchema,
});

export const assignTask = Workflow.name("task.assign")
  .input(AssignInputSchema)
  .handler(async ({ input }, ctx) => {
    await ctx.step.run(fetchTaskStep, { id: input.taskId });

    if (input.isLead) {
      await unsetLeadAssignee(ctx.db, input.taskId);
    }

    const [result] = await ctx.db
      .insert(taskAssignee)
      .values({
        assignedBy: input.assignedBy,
        isLead: input.isLead ?? false,
        taskId: input.taskId,
        userId: input.userId,
      })
      .returning();

    await ensureWatcher(ctx.db, input.taskId, input.userId);
    await addActivity(ctx.db, {
      action: "assignee_added",
      newValue: {
        userId: input.userId,
      },
      oldValue: null,
      taskId: input.taskId,
      userId: input.assignedBy,
    });

    return result;
  });
