import { attachment } from "#/db-schemas/attachment";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const listAttachmentsByComment = Workflow.name("collaboration.list-attachments-by-comment")
  .input(object({ commentId: IdSchema }))
  .handler(async ({ commentId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(attachment).where(eq(attachment.commentId, commentId)),
    ),
  );
