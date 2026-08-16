import { calendar, calendarAttendee, calendarEvent } from "#/db-schemas";
import { AttendeeFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const ListInputSchema = object({ filters: optional(AttendeeFiltersSchema) });

export const listAttendees = Workflow.name("calendar.attendee.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(AttendeeFiltersSchema, filters ?? {});

    const accessibleCalendars = ctx.db
      .select({ id: calendar.id })
      .from(calendar)
      .where(or(eq(calendar.access, "global"), eq(calendar.ownerId, ctx.actorId)));

    const accessibleEvents = ctx.db
      .select({ id: calendarEvent.id })
      .from(calendarEvent)
      .where(inArray(calendarEvent.calendarId, accessibleCalendars));

    const conditions = [inArray(calendarAttendee.eventId, accessibleEvents)];

    if (parsed.eventId) {
      conditions.push(eq(calendarAttendee.eventId, parsed.eventId));
    }
    if (parsed.email) {
      conditions.push(eq(calendarAttendee.email, parsed.email));
    }
    if (parsed.status) {
      conditions.push(eq(calendarAttendee.status, parsed.status));
    }

    return ctx.db
      .select()
      .from(calendarAttendee)
      .where(and(...conditions))
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });
