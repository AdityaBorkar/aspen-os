import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { separationTask } from "../../../db-schemas";

const InputSchema = object({
  separationId: pipe(string(), minLength(1, "separationId is required")),
});

export const listSeparationTasks = Workflow.name("hr.lifecycle.list-separation-tasks")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { separationId } = input;

    return ctx.db
      .select()
      .from(separationTask)
      .where(eq(separationTask.separationId, separationId));
  });
