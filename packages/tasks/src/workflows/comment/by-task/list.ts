import { comment } from "#/db-schemas/comment";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object } from "valibot";

export const listCommentsByTask = Workflow.name("comment.list-by-task")
  .input(object({ taskId: IdSchema }))
  .handler(async ({ taskId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(comment)
        .where(eq(comment.task_id, taskId))
        .orderBy(desc(comment.created_at)),
    ),
  );
