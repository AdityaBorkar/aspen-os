import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { watcher } from "../db-schemas/watcher";
import { IdSchema } from "../types";

export const removeWatcher = Workflow.name("collaboration.remove-watcher")
  .input(object({ taskId: IdSchema, userId: IdSchema }))
  .handler(async ({ taskId, userId }, ctx) => {
    await ctx.db
      .delete(watcher)
      .where(and(eq(watcher.taskId, taskId), eq(watcher.userId, userId)));
  });
