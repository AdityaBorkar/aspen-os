import { timeEntry } from "#/db-schemas/time-entry";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const deleteTimeEntry = Workflow.name("time-entry.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(timeEntry).where(eq(timeEntry.id, id));
  });
