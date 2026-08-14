import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { attachment } from "../db-schemas/attachment";
import { IdSchema } from "../types";

export const listAttachmentsByComment = Workflow.name("collaboration.list-attachments-by-comment")
  .input(object({ commentId: IdSchema }))
  .handler(async ({ commentId }, ctx) =>
    ctx.step.run("query", async () => {
      return ctx.db.select().from(attachment).where(eq(attachment.commentId, commentId));
    }),
  );
