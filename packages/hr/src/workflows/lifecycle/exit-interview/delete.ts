import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { exitInterview } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteExitInterview = Workflow.name("hr.lifecycle.delete-exit-interview")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(exitInterview)
      .where(eq(exitInterview.id, id))
      .returning();

    return deleted;
  });
