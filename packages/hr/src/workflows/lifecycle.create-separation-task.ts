import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { separationTask } from "../db-schemas";
import { CreateSeparationTaskSchema } from "../types";
import { fetchSeparationById } from "./utils";

const InputSchema = object({
  input: CreateSeparationTaskSchema,
});

export const createSeparationTask = Workflow.name("hr.lifecycle.create-separation-task")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSeparationTaskSchema, input);

    // Verify separation exists
    await fetchSeparationById(ctx.db, parsed.separationId);

    const [result] = await ctx.db
      .insert(separationTask)
      .values({
        assignedTo: parsed.assignedTo ?? null,
        department: parsed.department ?? null,
        description: parsed.description ?? null,
        dueDate: parsed.dueDate ?? null,
        notes: parsed.notes ?? null,
        separationId: parsed.separationId,
        title: parsed.title,
      })
      .returning();

    return result;
  });
