import { calendar } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const fetchCalendarStep = WorkflowStep.name("calendar-fetch-calendar")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db.select().from(calendar).where(eq(calendar.id, input.id)).limit(1);
    if (!row) {
      throw new Error(`Calendar with id "${input.id}" not found.`);
    }
    return row;
  });
