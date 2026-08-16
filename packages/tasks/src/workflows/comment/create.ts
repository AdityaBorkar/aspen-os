import { comment } from "#/db-schemas/comment";
import { publishTaskCommented } from "#/services/notification-bridge";
import { CreateCommentSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

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

    if (!result) {
      throw new Error("Failed to create comment.");
    }

    await ctx.step.run("notify", async () => {
      await publishTaskCommented(
        {
          comment: {
            body: result.body,
            id: result.id,
          },
          taskId: result.taskId,
        },
        { pubsub: ctx.pubsub },
      );
    });

    return result;
  });
