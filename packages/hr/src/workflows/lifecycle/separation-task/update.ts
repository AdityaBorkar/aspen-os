import { separationTask } from "#/db-schemas";
import { UpdateSeparationTaskSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateSeparationTaskSchema,
});

export const updateSeparationTask = Workflow.name("hr.lifecycle.update-separation-task")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateSeparationTaskSchema, patch);

    const updateData: Record<string, unknown> = {
      ...parsed,
      updatedAt: new Date(),
    };
    if (parsed.status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await ctx.db
      .update(separationTask)
      .set(updateData)
      .where(eq(separationTask.id, id))
      .returning();

    return updated;
  });
