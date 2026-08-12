import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object } from "valibot";

import { comment } from "../db-schemas/comment";
import { IdSchema } from "../types";

export const listCommentReplies = Workflow.name("comment.list-replies")
  .input(object({ parentId: IdSchema }))
  .handler(async ({ parentId }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(comment)
        .where(eq(comment.parentId, parentId))
        .orderBy(desc(comment.createdAt));
    });
  });
