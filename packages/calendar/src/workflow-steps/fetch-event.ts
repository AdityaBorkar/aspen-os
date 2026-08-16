import { calendarEvent } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const fetchEventStep = WorkflowStep.name("calendar-fetch-event")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(calendarEvent)
      .where(eq(calendarEvent.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Event with id "${input.id}" not found.`);
    }
    return row;
  });
