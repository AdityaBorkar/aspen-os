import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { attachment } from "../db-schemas/attachment";
import { IdSchema } from "../types";

export const deleteAttachment = Workflow.name("collaboration.delete-attachment")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(attachment).where(eq(attachment.id, id));
  });
