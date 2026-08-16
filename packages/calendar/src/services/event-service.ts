import { calendar, calendarEvent } from "#/db-schemas";
import type { EventFilters } from "#/schemas";

import { and, asc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

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
  db: NodePgDatabase,
  actorId: string,
  filters: EventFilters,
): Promise<(typeof calendarEvent.$inferSelect)[]> {
  const accessibleCalendars = db
    .select({ id: calendar.id })
    .from(calendar)
    .where(or(eq(calendar.access, "global"), eq(calendar.ownerId, actorId)));

  const conditions = [inArray(calendarEvent.calendarId, accessibleCalendars)];

  if (filters.calendarId) {
    conditions.push(eq(calendarEvent.calendarId, filters.calendarId));
  }
  if (filters.from) {
    conditions.push(gte(calendarEvent.startsAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(calendarEvent.startsAt, filters.to));
  }
  if (filters.status) {
    conditions.push(eq(calendarEvent.status, filters.status));
  }
  if (filters.sourceType) {
    conditions.push(eq(calendarEvent.sourceType, filters.sourceType));
  }
  if (filters.sourceEntityId) {
    conditions.push(eq(calendarEvent.sourceEntityId, filters.sourceEntityId));
  }
  if (filters.search) {
    conditions.push(ilike(calendarEvent.title, `%${filters.search}%`));
  }

  return db
    .select()
    .from(calendarEvent)
    .where(and(...conditions))
    .orderBy(asc(calendarEvent.startsAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);
}
