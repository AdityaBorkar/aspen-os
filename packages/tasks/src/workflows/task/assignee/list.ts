import { taskAssignee } from "#/db-schemas/task-assignee";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const getTaskAssignees = Workflow.name("task.assignees")
  .input(object({ taskId: IdSchema }))
  .handler(async ({ taskId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(taskAssignee).where(eq(taskAssignee.taskId, taskId)),
    ),
  );
