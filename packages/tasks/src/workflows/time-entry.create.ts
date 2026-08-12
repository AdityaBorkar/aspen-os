import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { timeEntry } from "../db-schemas/time-entry";
import { CreateTimeEntrySchema } from "../types";

const CreateInputSchema = object({
  input: CreateTimeEntrySchema,
});

export const createTimeEntry = Workflow.name("time-entry.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(timeEntry)
      .values({
        billable: input.billable ?? false,
        date: (input.date ?? new Date()).toISOString().slice(0, 10),
        description: input.description ?? null,
        duration: input.duration,
        taskId: input.taskId,
        userId: input.userId,
      })
      .returning();

    return result;
  });
