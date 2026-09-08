import { comment } from "#/db-schemas/comment";
import { TASK_EVENTS } from "#/pubsub";
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
        parent_id: input.parentId ?? null,
        task_id: input.taskId,
        user_id: input.userId,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create comment.");
    }

    await ctx.step.run("notify", async () => {
      await ctx.pubsub.publish(TASK_EVENTS.COMMENTED, {
        comment: {
          body: result.body,
          id: result.id,
        },
        taskId: result.task_id,
      });
    });

    return result;
  });
