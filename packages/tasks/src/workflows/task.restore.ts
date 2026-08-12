import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { task } from "../db-schemas/task";
import { IdSchema } from "../types";
import { fetchTaskStep } from "./steps/fetch-task";

export const restoreTask = Workflow.name("task.restore")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchTaskStep, { id });
    const [updated] = await ctx.db
      .update(task)
      .set({ isArchived: false, updatedAt: new Date() })
      .where(eq(task.id, id))
      .returning();
    return updated;
  });
