import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { comment } from "../../db-schemas/comment";
import { IdSchema } from "../../types";
import { fetchCommentStep } from "../../workflow-steps/fetch-comment";

export const deleteComment = Workflow.name("comment.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchCommentStep, { id });
    const [updated] = await ctx.db
      .update(comment)
      .set({ body: "[comment deleted]", isDeleted: true })
      .where(eq(comment.id, id))
      .returning();

    return updated;
  });
