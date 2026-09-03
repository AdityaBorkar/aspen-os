import { taskLink } from "#/db-schemas/task-link";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const listLinksByTask = Workflow.name("link.list-by-task")
  .input(object({ taskId: IdSchema }))
  .handler(async ({ taskId }, ctx) =>
    ctx.step.run("query", async () => {
      const [outgoing, incoming] = await Promise.all([
        ctx.db.select().from(taskLink).where(eq(taskLink.sourceId, taskId)),
        ctx.db.select().from(taskLink).where(eq(taskLink.targetId, taskId)),
      ]);

      return { incoming, outgoing };
    }),
  );
