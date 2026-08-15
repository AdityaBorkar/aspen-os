import { employeeSeparation, separationTask } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteSeparation = Workflow.name("hr.lifecycle.delete-separation")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    // Delete tasks first
    await ctx.db.delete(separationTask).where(eq(separationTask.separationId, id));

    const [deleted] = await ctx.db
      .delete(employeeSeparation)
      .where(eq(employeeSeparation.id, id))
      .returning();

    return deleted;
  });
