import type { AttendeeStatus, CalendarAudienceType } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";

export const EVENT_EVENTS = {
  CANCELLED: "calendar.event_cancelled",
  CREATED: "calendar.event_created",
  DELETED: "calendar.event_deleted",
  UPDATED: "calendar.event_updated",
} as const;

export const ATTENDEE_EVENTS = {
  INVITED: "calendar.attendee_invited",
  REMOVED: "calendar.attendee_removed",
  UPDATED: "calendar.attendee_updated",
} as const;

export const REMINDER_EVENTS = {
  CREATED: "calendar.reminder_created",
  DELETED: "calendar.reminder_deleted",
  DUE: "calendar.reminder_due",
  UPDATED: "calendar.reminder_updated",
} as const;

export const events = {
  ATTENDEE_EVENTS,
  EVENT_EVENTS,
  REMINDER_EVENTS,
};

export interface CalendarEventPayload {
  [key: string]: JsonValue;
  audienceId: string | null;
  audienceType: CalendarAudienceType;
  endsAt: string | null;
  id: string;
  startsAt: string;
  title: string;
}

export interface EventCreatedEvent {
  event: CalendarEventPayload;
  sourceEntityId?: string | null;
  sourceType?: string | null;
}

export interface EventUpdatedEvent {
  event: CalendarEventPayload;
  sourceEntityId?: string | null;
  sourceType?: string | null;
}

export interface EventCancelledEvent {
  event: CalendarEventPayload;
}

export interface EventDeletedEvent {
  eventId: string;
}

export interface AttendeePayload {
  [key: string]: JsonValue;
  email: string;
  id: string;
  name: string | null;
  status: AttendeeStatus;
}

export interface AttendeeInvitedEvent {
  attendee: AttendeePayload;
  eventId: string;
}

export interface AttendeeUpdatedEvent {
  attendee: AttendeePayload;
  eventId: string;
}

export interface AttendeeRemovedEvent {
  attendeeId: string;
  eventId: string;
}

export interface ReminderPayload {
  [key: string]: JsonValue;
  audienceId: string | null;
  audienceType: CalendarAudienceType;
  channel: string;
  id: string;
  isRecurring: boolean;
  message: string | null;
  targetId: string;
  targetType: string;
  type: string;
  /**
   * Concrete recipient, populated on the per-recipient `reminder_due`
   * fan-out, and `null` on create/update events (a reminder row carries an
   * audience, not a single owner).
   */
  userId: string | null;
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

export type CalendarModuleEventMap = EventEventMap & AttendeeEventMap & ReminderEventMap;
