import { calendar, calendarEvent, calendarReminder } from "#/db-schemas";
import { ReminderFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const ListInputSchema = object({ filters: optional(ReminderFiltersSchema) });

export const listReminders = Workflow.name("calendar.reminder.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(ReminderFiltersSchema, filters ?? {});

    const accessibleCalendars = ctx.db
      .select({ id: calendar.id })
      .from(calendar)
      .where(or(eq(calendar.access, "global"), eq(calendar.ownerId, ctx.actorId)));

    const accessibleEvents = ctx.db
      .select({ id: calendarEvent.id })
      .from(calendarEvent)
      .where(inArray(calendarEvent.calendarId, accessibleCalendars));

    const conditions = [
      or(
        eq(calendarReminder.userId, ctx.actorId),
        and(
          eq(calendarReminder.targetType, "event"),
          inArray(calendarReminder.targetId, accessibleEvents),
        ),
      ),
    ];

    if (parsed.targetType) {
      conditions.push(eq(calendarReminder.targetType, parsed.targetType));
    }
    if (parsed.targetId) {
      conditions.push(eq(calendarReminder.targetId, parsed.targetId));
    }
    if (parsed.type) {
      conditions.push(eq(calendarReminder.type, parsed.type));
    }
    if (parsed.userId) {
      conditions.push(eq(calendarReminder.userId, parsed.userId));
    }
    if (parsed.isSent !== undefined) {
      conditions.push(eq(calendarReminder.isSent, parsed.isSent));
    }

    return ctx.db
      .select()
      .from(calendarReminder)
      .where(and(...conditions))
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });
