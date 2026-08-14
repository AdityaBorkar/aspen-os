import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { type TaskCompletionSummary, IdSchema } from "../../types";
import { getSubTasks } from "./sub-task/list";

export const getTaskCompletionSummary = Workflow.name("task.completion-summary")
  .input(object({ parentId: IdSchema }))
  .handler(async ({ parentId }, _ctx): Promise<TaskCompletionSummary> => {
    const subTasks = await getSubTasks.run({ parentId });
    const completed = subTasks.filter((subTask) => subTask.completedAt !== null).length;
    const total = subTasks.length;

    return {
      completedCount: completed,
      completionPercentage: total === 0 ? 0 : Math.round((completed / total) * 100),
      totalCount: total,
    };
  });
