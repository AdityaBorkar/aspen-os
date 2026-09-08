import { calendar, calendarEvent } from "#/db-schemas";
import { CALENDAR_ACCESS } from "#/utils/constants";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { eq, inArray, or } from "drizzle-orm";

type CalendarDb = WorkflowContext["db"];

/** Calendars visible to `actorId`: global calendars plus owned ones. */
export function visibleCalendarCondition(actorId: string) {
  return or(eq(calendar.access, CALENDAR_ACCESS.GLOBAL), eq(calendar.owner_id, actorId));
}

/** Ids of calendars visible to `actorId`. */
export function accessibleCalendarIds(db: CalendarDb, actorId: string) {
  return db.select({ id: calendar.id }).from(calendar).where(visibleCalendarCondition(actorId));
}

/** Ids of events in calendars visible to `actorId`. */
export function accessibleEventIds(db: CalendarDb, actorId: string) {
  return db
    .select({ id: calendarEvent.id })
    .from(calendarEvent)
    .where(inArray(calendarEvent.calendar_id, accessibleCalendarIds(db, actorId)));
}

/**
 * LIKE's default escape character. `escapeLikePattern` uses it to escape `%`,
 * `_`, and itself so user search input matches literally inside a
 * `LIKE`/`ILIKE` pattern.
 */
const LIKE_ESCAPE = "\\";

export function escapeLikePattern(value: string): string {
  return value
    .replaceAll(LIKE_ESCAPE, `${LIKE_ESCAPE}${LIKE_ESCAPE}`)
    .replaceAll("%", `${LIKE_ESCAPE}%`)
    .replaceAll("_", `${LIKE_ESCAPE}_`);
}
