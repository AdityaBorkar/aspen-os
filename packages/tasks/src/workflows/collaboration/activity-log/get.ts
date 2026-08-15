import { activityLog } from "#/db-schemas/activity-log";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, optional } from "valibot";

export const getActivityLog = Workflow.name("collaboration.activity-log")
  .input(object({ action: optional(IdSchema), taskId: IdSchema }))
  .handler(async ({ taskId, action }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions = [eq(activityLog.taskId, taskId)];
      if (action) {
        conditions.push(eq(activityLog.action, action));
      }

      return ctx.db
        .select()
        .from(activityLog)
        .where(and(...conditions))
        .orderBy(desc(activityLog.createdAt));
    }),
  );
