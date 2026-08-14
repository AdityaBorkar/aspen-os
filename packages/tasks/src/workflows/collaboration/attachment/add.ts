import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { attachment } from "../../../db-schemas/attachment";
import { CreateAttachmentSchema } from "../../../types";

const CreateInputSchema = object({
  input: CreateAttachmentSchema,
});

export const addAttachment = Workflow.name("collaboration.add-attachment")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(attachment)
      .values({
        commentId: input.commentId ?? null,
        fileId: input.fileId,
        taskId: input.taskId,
        uploadedBy: input.uploadedBy,
      })
      .returning();

    return result;
  });
