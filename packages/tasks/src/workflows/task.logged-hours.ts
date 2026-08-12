import { Workflow } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";
import { object } from "valibot";

import { timeEntry } from "../db-schemas/time-entry";
import { IdSchema } from "../types";

export const getTaskLoggedHours = Workflow.name("task.logged-hours")
  .input(object({ taskId: IdSchema }))
  .handler(async ({ taskId }, ctx) => {
    return ctx.step.run("query", async () => {
      const [result] = await ctx.db
        .select({ total: sql<string>`COALESCE(SUM(duration), 0)` })
        .from(timeEntry)
        .where(eq(timeEntry.taskId, taskId));

      return result?.total ? Number.parseFloat(result.total) : 0;
    });
  });
