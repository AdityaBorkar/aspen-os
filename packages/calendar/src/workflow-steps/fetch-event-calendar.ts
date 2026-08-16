import { calendar, calendarEvent } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchEventCalendarStep = WorkflowStep.name("calendar-fetch-event-calendar")
  .input(object({ eventId: string() }))
  .handler(async ({ eventId }, ctx) => {
    const [event] = await ctx.db
      .select({ calendarId: calendarEvent.calendarId })
      .from(calendarEvent)
      .where(eq(calendarEvent.id, eventId))
      .limit(1);

    if (!event) {
      throw new Error(`Event with id "${eventId}" not found.`);
    }

    const [row] = await ctx.db
      .select()
      .from(calendar)
      .where(eq(calendar.id, event.calendarId))
      .limit(1);

    if (!row) {
      throw new Error(`Calendar with id "${event.calendarId}" not found.`);
    }

    return row;
  });
