import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { watcher } from "../../../db-schemas/watcher";
import { IdSchema } from "../../../types";

export const listWatchers = Workflow.name("collaboration.list-watchers")
  .input(object({ taskId: IdSchema }))
  .handler(async ({ taskId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(watcher).where(eq(watcher.taskId, taskId)),
    ),
  );
