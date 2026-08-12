import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { comment } from "../db-schemas/comment";
import { CreateCommentSchema } from "../types";

const CreateInputSchema = object({
  input: CreateCommentSchema,
});

export const createComment = Workflow.name("comment.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(comment)
      .values({
        body: input.body,
        parentId: input.parentId ?? null,
        taskId: input.taskId,
        userId: input.userId,
      })
      .returning();

    return result;
  });
