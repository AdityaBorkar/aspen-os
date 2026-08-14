import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { separationTask } from "../../../db-schemas";

const InputSchema = object({
  completedBy: pipe(string(), minLength(1, "completedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const completeSeparationTask = Workflow.name("hr.lifecycle.complete-separation-task")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, completedBy } = input;

    const [updated] = await ctx.db
      .update(separationTask)
      .set({
        completedAt: new Date(),
        completedBy,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(separationTask.id, id))
      .returning();

    return updated;
  });
