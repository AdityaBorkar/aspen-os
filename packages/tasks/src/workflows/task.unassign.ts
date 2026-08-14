import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { taskAssignee } from "../db-schemas/task-assignee";
import { IdSchema } from "../types";
import { addActivity } from "./utils";

export const unassignTask = Workflow.name("task.unassign")
  .input(object({ taskId: IdSchema, userId: IdSchema }))
  .handler(async ({ taskId, userId }, ctx) => {
    await ctx.db
      .delete(taskAssignee)
      .where(and(eq(taskAssignee.taskId, taskId), eq(taskAssignee.userId, userId)));

    await addActivity(ctx.db, {
      action: "assignee_removed",
      newValue: null,
      oldValue: { userId },
      taskId,
      userId,
    });
  });
