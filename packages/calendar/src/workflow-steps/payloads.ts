import type { calendarAttendee, calendarEvent, calendarReminder } from "#/db-schemas";
import type { AttendeePayload, CalendarEventPayload, ReminderPayload } from "#/pubsub";

type EventRow = typeof calendarEvent.$inferSelect;
type AttendeeRow = typeof calendarAttendee.$inferSelect;
type ReminderRow = typeof calendarReminder.$inferSelect;

export function toEventPayload(row: EventRow): CalendarEventPayload {
  return {
    audienceId: row.audience_id,
    audienceType: row.audience_type,
    endsAt: row.ends_at?.toISOString() ?? null,
    id: row.id,
    startsAt: row.starts_at.toISOString(),
    title: row.title,
  };
}

export function toAttendeePayload(row: AttendeeRow): AttendeePayload {
  return {
    email: row.email,
    id: row.id,
    name: row.name,
    status: row.status,
  };
}

export function toReminderPayload(row: ReminderRow, recipientUserId?: string): ReminderPayload {
  return {
    audienceId: row.audience_id,
    audienceType: row.audience_type,
    channel: row.channel,
    id: row.id,
    isRecurring: row.is_recurring,
    message: row.message,
    targetId: row.target_id,
    targetType: row.target_type,
    type: row.type,
    userId: recipientUserId ?? null,
  };
}
