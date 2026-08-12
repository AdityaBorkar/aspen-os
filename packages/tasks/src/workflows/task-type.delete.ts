import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { taskType } from "../db-schemas/task-type";
import { IdSchema } from "../types";

export const deleteTaskType = Workflow.name("task-type.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(taskType).where(eq(taskType.id, id));
  });
