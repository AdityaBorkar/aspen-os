import {
  ATTENDEE_STATUS,
  ATTENDEE_TYPE,
  CALENDAR_ACCESS,
  EVENT_STATUS,
  RECURRENCE_FREQUENCY,
  REMINDER_CHANNEL,
  REMINDER_TARGET,
  REMINDER_TYPE,
} from "#/utils/constants";

import { pgEnum } from "drizzle-orm/pg-core";

export const calendarAccessEnum = pgEnum("calendar_access", [
  CALENDAR_ACCESS.PERSONAL,
  CALENDAR_ACCESS.GLOBAL,
]);

export const calendarEventStatusEnum = pgEnum("calendar_event_status", [
  EVENT_STATUS.CONFIRMED,
  EVENT_STATUS.TENTATIVE,
  EVENT_STATUS.CANCELLED,
]);

export const calendarRecurrenceFrequencyEnum = pgEnum("calendar_recurrence_frequency", [
  RECURRENCE_FREQUENCY.DAILY,
  RECURRENCE_FREQUENCY.WEEKLY,
  RECURRENCE_FREQUENCY.MONTHLY,
  RECURRENCE_FREQUENCY.YEARLY,
]);

export const calendarReminderTargetEnum = pgEnum("calendar_reminder_target", [
  REMINDER_TARGET.EVENT,
  REMINDER_TARGET.TASK,
  REMINDER_TARGET.NOTE,
  REMINDER_TARGET.FILE,
  REMINDER_TARGET.CUSTOM,
]);

export const calendarReminderTypeEnum = pgEnum("calendar_reminder_type", [
  REMINDER_TYPE.OFFSET,
  REMINDER_TYPE.CUSTOM,
  REMINDER_TYPE.DUE_DATE,
  REMINDER_TYPE.OVERDUE,
]);

export const calendarReminderChannelEnum = pgEnum("calendar_reminder_channel", [
  REMINDER_CHANNEL.PUBSUB,
]);

export const calendarAttendeeTypeEnum = pgEnum("calendar_attendee_type", [
  ATTENDEE_TYPE.USER,
  ATTENDEE_TYPE.CONTACT,
]);

export const calendarAttendeeStatusEnum = pgEnum("calendar_attendee_status", [
  ATTENDEE_STATUS.INVITED,
  ATTENDEE_STATUS.ACCEPTED,
  ATTENDEE_STATUS.DECLINED,
  ATTENDEE_STATUS.TENTATIVE,
]);
