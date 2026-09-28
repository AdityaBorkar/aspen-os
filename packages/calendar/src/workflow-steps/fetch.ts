import { calendarAttendee, calendarEvent, calendarReminder } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import type { WorkflowContext } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

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
