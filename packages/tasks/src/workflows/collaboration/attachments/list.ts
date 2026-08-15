import { attachment } from "#/db-schemas/attachment";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const listAttachments = Workflow.name("collaboration.list-attachments")
  .input(object({ taskId: IdSchema }))
  .handler(async ({ taskId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(attachment).where(eq(attachment.taskId, taskId)),
    ),
  );
