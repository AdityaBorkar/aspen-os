import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { separationTask } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getSeparationTaskById = Workflow.name(
  "hr.lifecycle.get-separation-task-by-id",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(separationTask)
      .where(eq(separationTask.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Separation task with id "${id}" not found.`);
    }

    return result;
  });
