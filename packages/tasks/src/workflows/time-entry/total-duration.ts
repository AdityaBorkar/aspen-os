import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { boolean, object, optional } from "valibot";

import { timeEntry } from "../../db-schemas/time-entry";
import { IdSchema } from "../../types";

export const getTimeEntryTotalDuration = Workflow.name("time-entry.total-duration")
  .input(object({ billableOnly: optional(boolean()), taskId: IdSchema }))
  .handler(async ({ taskId, billableOnly }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions = [eq(timeEntry.taskId, taskId)];
      if (billableOnly) {
        conditions.push(eq(timeEntry.billable, true));
      }

      const [result] = await ctx.db
        .select({ total: sql<string>`COALESCE(SUM(duration), 0)` })
        .from(timeEntry)
        .where(and(...conditions));

      return result?.total ? Number.parseInt(result.total, 10) : 0;
    }),
  );
