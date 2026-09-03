import { comment } from "#/db-schemas/comment";
import { IdSchema } from "#/types";
import { requireRow } from "#/workflows/utils";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchCommentStep = WorkflowStep.name("fetch-comment")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const rows = await ctx.db.select().from(comment).where(eq(comment.id, input.id)).limit(1);

    return requireRow(rows, "Comment", input.id);
  });
