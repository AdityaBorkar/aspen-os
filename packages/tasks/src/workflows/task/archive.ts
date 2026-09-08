import { task } from "#/db-schemas/task";
import { IdSchema } from "#/types";
import { fetchTaskStep } from "#/workflow-steps/fetch-task";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const archiveTask = Workflow.name("task.archive")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchTaskStep, { id });
    const [updated] = await ctx.db
      .update(task)
      .set({ is_archived: true, updated_at: new Date() })
      .where(eq(task.id, id))
      .returning();
    return updated;
  });
