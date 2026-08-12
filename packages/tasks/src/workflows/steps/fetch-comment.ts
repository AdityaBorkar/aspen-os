import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { comment } from "../../db-schemas/comment";
import { IdSchema } from "../../types";

export const fetchCommentStep = WorkflowStep.name("fetch-comment")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(comment)
      .where(eq(comment.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Comment with id "${input.id}" not found.`);
    }

    return result;
  });
