import { comment } from "#/db-schemas/comment";
import { IdSchema, UpdateCommentSchema } from "#/types";
import { fetchCommentStep } from "#/workflow-steps/fetch-comment";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateCommentSchema,
});

export const updateComment = Workflow.name("comment.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    await ctx.step.run(fetchCommentStep, { id });

    const [updated] = await ctx.db
      .update(comment)
      .set({ body: patch.body, editedAt: new Date() })
      .where(eq(comment.id, id))
      .returning();

    return updated;
  });
