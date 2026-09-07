import type { calendar, calendarAttendee, calendarEvent, calendarReminder } from "#/db-schemas";
import type {
  AttendeePayload,
  CalendarCreatedEvent,
  CalendarEventPayload,
  ReminderPayload,
} from "#/pubsub";

type CalendarRow = typeof calendar.$inferSelect;
type EventRow = typeof calendarEvent.$inferSelect;
type AttendeeRow = typeof calendarAttendee.$inferSelect;
type ReminderRow = typeof calendarReminder.$inferSelect;

export function toCalendarPayload(row: CalendarRow) {
  return {
    access: row.access,
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
  } satisfies CalendarCreatedEvent["calendar"];
}

export function toEventPayload(row: EventRow) {
  return {
    calendarId: row.calendarId,
    endsAt: row.endsAt?.toISOString() ?? null,
    id: row.id,
    startsAt: row.startsAt.toISOString(),
    title: row.title,
  } satisfies CalendarEventPayload;
}

export function toAttendeePayload(row: AttendeeRow) {
  return {
    email: row.email,
    id: row.id,
    name: row.name,
    status: row.status,
  } satisfies AttendeePayload;
}

export function toReminderPayload(row: ReminderRow) {
  return {
    channel: row.channel,
    id: row.id,
    isRecurring: row.isRecurring,
    message: row.message,
    targetId: row.targetId,
    targetType: row.targetType,
    type: row.type,
    userId: row.userId,
  } satisfies ReminderPayload;
}
