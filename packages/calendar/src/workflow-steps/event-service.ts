import { calendarEvent, calendarReminder } from "#/db-schemas";
import type { EventFilters } from "#/schemas";
import { REMINDER_TARGET, REMINDER_TYPE } from "#/utils/constants";
import { accessibleCalendarIds, escapeLikePattern } from "#/workflow-steps/access-scope";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, asc, eq, gte, ilike, inArray, isNotNull, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type CalendarDb = WorkflowContext["db"];

export interface EventWindowInput {
  allDay?: boolean;
  endsAt?: Date | null;
  startsAt: Date;
}

export function validateEventWindow(input: EventWindowInput): void {
  if (input.allDay) {
    return;
  }
  if (!input.endsAt) {
    throw new Error("endsAt is required for timed events");
  }
  if (input.startsAt >= input.endsAt) {
    throw new Error("startsAt must be before endsAt");
  }
}

export function validateSourceLink(
  sourceType: string | null | undefined,
  sourceEntityId: string | null | undefined,
): void {
  if (sourceType && !sourceEntityId) {
    throw new Error("sourceEntityId is required when sourceType is set");
  }
}

export async function queryEvents(
  db: CalendarDb,
  actorId: string,
  filters: EventFilters,
): Promise<(typeof calendarEvent.$inferSelect)[]> {
  const conditions = [inArray(calendarEvent.calendar_id, accessibleCalendarIds(db, actorId))];

  if (filters.calendarId) {
    conditions.push(eq(calendarEvent.calendar_id, filters.calendarId));
  }
  if (filters.from) {
    conditions.push(gte(calendarEvent.starts_at, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(calendarEvent.starts_at, filters.to));
  }
  if (filters.status) {
    conditions.push(eq(calendarEvent.status, filters.status));
  }
  if (filters.sourceType) {
    conditions.push(eq(calendarEvent.source_type, filters.sourceType));
  }
  if (filters.sourceEntityId) {
    conditions.push(eq(calendarEvent.source_entity_id, filters.sourceEntityId));
  }
  if (filters.search) {
    conditions.push(ilike(calendarEvent.title, `%${escapeLikePattern(filters.search)}%`));
  }

  return db
    .select()
    .from(calendarEvent)
    .where(and(...conditions))
    .orderBy(asc(calendarEvent.starts_at))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);
}

/**
 * Re-anchors every `offset` reminder of an event after its start moves:
 * `remindAt = nextStartsAt − offsetMinutes`. A single UPDATE — no N+1, and
 * rows without an offset are left untouched.
 */
export async function rescheduleOffsetReminders(
  db: PostgresJsDatabase,
  eventId: string,
  nextStartsAt: Date,
): Promise<void> {
  await db
    .update(calendarReminder)
    .set({
      remind_at: sql`${nextStartsAt} - (${calendarReminder.offset_minutes} * INTERVAL '1 minute')`,
    })
    .where(
      and(
        eq(calendarReminder.target_type, REMINDER_TARGET.EVENT),
        eq(calendarReminder.target_id, eventId),
        eq(calendarReminder.type, REMINDER_TYPE.OFFSET),
        isNotNull(calendarReminder.offset_minutes),
      ),
    );
}
