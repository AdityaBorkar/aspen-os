import { attachment } from "#/db-schemas/attachment";
import { CreateAttachmentSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({
  input: CreateAttachmentSchema,
});

export const addAttachment = Workflow.name("collaboration.add-attachment")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(attachment)
      .values({
        comment_id: input.commentId ?? null,
        file_id: input.fileId,
        task_id: input.taskId,
        uploaded_by: input.uploadedBy,
      })
      .returning();

    return result;
  });
