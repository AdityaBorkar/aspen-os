import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import type { TaskCompletionSummary } from "../types";
import { IdSchema } from "../types";
import { getSubTasks } from "./task.sub-tasks";

export const getTaskCompletionSummary = Workflow.name("task.completion-summary")
  .input(object({ parentId: IdSchema }))
  .handler(async ({ parentId }, _ctx): Promise<TaskCompletionSummary> => {
    const subTasks = await getSubTasks.run({ parentId });
    const completed = subTasks.filter((t) => t.completedAt !== null).length;
    const total = subTasks.length;

    return {
      completedCount: completed,
      completionPercentage: total === 0 ? 0 : Math.round((completed / total) * 100),
      totalCount: total,
    };
  });
