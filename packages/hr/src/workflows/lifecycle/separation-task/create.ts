import { separationTask } from "#/db-schemas";
import { CreateSeparationTaskSchema } from "#/types";
import { fetchSeparationById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateSeparationTaskSchema,
});

export const createSeparationTask = Workflow.name("hr.lifecycle.create-separation-task")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Verify separation exists
    await fetchSeparationById(ctx.db, parsed.separationId);

    const [result] = await ctx.db
      .insert(separationTask)
      .values({
        assigned_to: parsed.assignedTo ?? null,
        department: parsed.department ?? null,
        description: parsed.description ?? null,
        due_date: parsed.dueDate ?? null,
        notes: parsed.notes ?? null,
        separation_id: parsed.separationId,
        title: parsed.title,
      })
      .returning();

    return result;
  });
