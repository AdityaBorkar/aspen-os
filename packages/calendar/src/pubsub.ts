import type { AttendeeStatus, CalendarAccess } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";

export const CALENDAR_EVENTS = {
  CREATED: "calendar:calendar_created",
  DELETED: "calendar:calendar_deleted",
  UPDATED: "calendar:calendar_updated",
} as const;

export const EVENT_EVENTS = {
  CANCELLED: "calendar:event_cancelled",
  CREATED: "calendar:event_created",
  DELETED: "calendar:event_deleted",
  UPDATED: "calendar:event_updated",
} as const;

export const ATTENDEE_EVENTS = {
  INVITED: "calendar:attendee_invited",
  REMOVED: "calendar:attendee_removed",
  UPDATED: "calendar:attendee_updated",
} as const;

export const REMINDER_EVENTS = {
  CREATED: "calendar:reminder_created",
  DELETED: "calendar:reminder_deleted",
  DUE: "calendar:reminder_due",
  UPDATED: "calendar:reminder_updated",
} as const;

export const events = {
  ATTENDEE_EVENTS,
  CALENDAR_EVENTS,
  EVENT_EVENTS,
  REMINDER_EVENTS,
};

export interface CalendarCreatedEvent {
  calendar: { access: CalendarAccess; id: string; name: string; ownerId: string };
}

export interface CalendarUpdatedEvent {
  calendar: { access: CalendarAccess; id: string; name: string; ownerId: string };
}

export interface CalendarDeletedEvent {
  calendarId: string;
}

export interface CalendarEventPayload {
  calendarId: string;
  endsAt: string | null;
  id: string;
  startsAt: string;
  title: string;
}

export interface EventCreatedEvent {
  calendarId: string;
  event: CalendarEventPayload;
  sourceEntityId?: string | null;
  sourceType?: string | null;
}

export interface EventUpdatedEvent {
  calendarId: string;
  event: CalendarEventPayload;
  sourceEntityId?: string | null;
  sourceType?: string | null;
}

export interface EventCancelledEvent {
  calendarId: string;
  event: CalendarEventPayload;
}

export interface EventDeletedEvent {
  calendarId: string;
  eventId: string;
}

export interface AttendeePayload {
  email: string;
  id: string;
  name: string | null;
  status: AttendeeStatus;
}

export interface AttendeeInvitedEvent {
  attendee: AttendeePayload;
  calendarId: string;
  eventId: string;
}

export interface AttendeeUpdatedEvent {
  attendee: AttendeePayload;
  calendarId: string;
  eventId: string;
}

export interface AttendeeRemovedEvent {
  attendeeId: string;
  calendarId: string;
  eventId: string;
}

export interface ReminderPayload {
  channel: string;
  id: string;
  isRecurring: boolean;
  message: string | null;
  targetId: string;
  targetType: string;
  type: string;
  userId: string;
}

export interface ReminderCreatedEvent {
  reminder: ReminderPayload;
}

export interface ReminderUpdatedEvent {
  changes: Record<string, JsonValue>;
  reminder: ReminderPayload;
}

export interface ReminderDeletedEvent {
  reminderId: string;
}

export interface ReminderDueEvent {
  remindAt: string;
  reminder: ReminderPayload;
}

export interface CalendarEventMap {
  [CALENDAR_EVENTS.CREATED]: CalendarCreatedEvent;
  [CALENDAR_EVENTS.DELETED]: CalendarDeletedEvent;
  [CALENDAR_EVENTS.UPDATED]: CalendarUpdatedEvent;
}

export interface EventEventMap {
  [EVENT_EVENTS.CANCELLED]: EventCancelledEvent;
  [EVENT_EVENTS.CREATED]: EventCreatedEvent;
  [EVENT_EVENTS.DELETED]: EventDeletedEvent;
  [EVENT_EVENTS.UPDATED]: EventUpdatedEvent;
}

export interface AttendeeEventMap {
  [ATTENDEE_EVENTS.INVITED]: AttendeeInvitedEvent;
  [ATTENDEE_EVENTS.REMOVED]: AttendeeRemovedEvent;
  [ATTENDEE_EVENTS.UPDATED]: AttendeeUpdatedEvent;
}

export interface ReminderEventMap {
  [REMINDER_EVENTS.CREATED]: ReminderCreatedEvent;
  [REMINDER_EVENTS.DELETED]: ReminderDeletedEvent;
  [REMINDER_EVENTS.DUE]: ReminderDueEvent;
  [REMINDER_EVENTS.UPDATED]: ReminderUpdatedEvent;
}

export type CalendarModuleEventMap = AttendeeEventMap &
  CalendarEventMap &
  EventEventMap &
  ReminderEventMap;
