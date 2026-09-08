import { calendar, calendarAttendee, calendarEvent, calendarReminder } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import type { WorkflowContext } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

type CalendarDb = WorkflowContext["db"];

function makeFetchStep<TRow>(
  stepName: string,
  entityLabel: string,
  selectById: (db: CalendarDb, id: string) => Promise<TRow | undefined>,
) {
  return WorkflowStep.name(stepName)
    .input(WithIdSchema)
    .handler(async (input, ctx) => {
      const row = await selectById(ctx.db, input.id);
      if (!row) {
        throw new Error(`${entityLabel} with id "${input.id}" not found.`);
      }
      return row;
    });
}

export const fetchCalendarStep = makeFetchStep(
  "calendar-fetch-calendar",
  "Calendar",
  async (db, id) => {
    const [row] = await db.select().from(calendar).where(eq(calendar.id, id)).limit(1);
    return row;
  },
);

export const fetchEventStep = makeFetchStep("calendar-fetch-event", "Event", async (db, id) => {
  const [row] = await db.select().from(calendarEvent).where(eq(calendarEvent.id, id)).limit(1);
  return row;
});

export const fetchAttendeeStep = makeFetchStep(
  "calendar-fetch-attendee",
  "Attendee",
  async (db, id) => {
    const [row] = await db
      .select()
      .from(calendarAttendee)
      .where(eq(calendarAttendee.id, id))
      .limit(1);
    return row;
  },
);

export const fetchReminderStep = makeFetchStep(
  "calendar-fetch-reminder",
  "Reminder",
  async (db, id) => {
    const [row] = await db
      .select()
      .from(calendarReminder)
      .where(eq(calendarReminder.id, id))
      .limit(1);
    return row;
  },
);

export const fetchEventCalendarStep = WorkflowStep.name("calendar-fetch-event-calendar")
  .input(object({ eventId: string() }))
  .handler(async ({ eventId }, ctx) => {
    const [event] = await ctx.db
      .select({ calendarId: calendarEvent.calendar_id })
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
