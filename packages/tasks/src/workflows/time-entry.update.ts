import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { timeEntry } from "../db-schemas/time-entry";
import { IdSchema, UpdateTimeEntrySchema } from "../types";
import { fetchTimeEntryStep } from "./steps/fetch-time-entry";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateTimeEntrySchema,
});

export const updateTimeEntry = Workflow.name("time-entry.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    await ctx.step.run(fetchTimeEntryStep, { id });

    const [updated] = await ctx.db
      .update(timeEntry)
      .set({
        billable: patch.billable,
        date: patch.date?.toISOString().slice(0, 10),
        description: patch.description,
        duration: patch.duration,
      })
      .where(eq(timeEntry.id, id))
      .returning();

    return updated;
  });
