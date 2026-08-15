import { comment } from "#/db-schemas/comment";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object } from "valibot";

export const listCommentReplies = Workflow.name("comment.list-replies")
  .input(object({ parentId: IdSchema }))
  .handler(async ({ parentId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(comment)
        .where(eq(comment.parentId, parentId))
        .orderBy(desc(comment.createdAt)),
    ),
  );
