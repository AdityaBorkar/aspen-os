import { timeEntry } from "#/db-schemas/time-entry";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchTimeEntryStep = WorkflowStep.name("fetch-time-entry")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(timeEntry)
      .where(eq(timeEntry.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Time entry with id "${input.id}" not found.`);
    }

    return result;
  });
