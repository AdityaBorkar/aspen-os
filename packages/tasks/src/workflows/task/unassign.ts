import { taskAssignee } from "#/db-schemas/task-assignee";
import { publishTaskUnassigned } from "#/services/notification-bridge";
import { IdSchema } from "#/types";
import { addActivity } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

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

    await ctx.step.run("notify", async () => {
      await publishTaskUnassigned({ taskId, userId }, { pubsub: ctx.pubsub });
    });
  });
