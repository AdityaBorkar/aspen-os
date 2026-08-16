import { calendarAttendee } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const fetchAttendeeStep = WorkflowStep.name("calendar-fetch-attendee")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(calendarAttendee)
      .where(eq(calendarAttendee.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Attendee with id "${input.id}" not found.`);
    }
    return row;
  });
