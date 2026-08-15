import { task } from "#/db-schemas/task";
import { IdSchema } from "#/types";
import { fetchTaskStep } from "#/workflow-steps/fetch-task";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const deleteTask = Workflow.name("task.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchTaskStep, { id });
    await ctx.db.delete(task).where(eq(task.id, id));
  });
