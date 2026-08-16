import {
  ATTENDEE_STATUS,
  ATTENDEE_TYPE,
  CALENDAR_ACCESS,
  EVENT_STATUS,
  RECURRENCE_FREQUENCY,
  REMINDER_CHANNEL,
  REMINDER_INTERVAL,
  REMINDER_TARGET,
  REMINDER_TYPE,
  WEEKDAY,
} from "#/utils/constants";

import { picklist } from "valibot";

export const CalendarAccessSchema = picklist(Object.values(CALENDAR_ACCESS));

export const EventStatusSchema = picklist(Object.values(EVENT_STATUS));

export const RecurrenceFrequencySchema = picklist(Object.values(RECURRENCE_FREQUENCY));

export const ReminderTargetSchema = picklist(Object.values(REMINDER_TARGET));

export const ReminderTypeSchema = picklist(Object.values(REMINDER_TYPE));

export const ReminderChannelSchema = picklist(Object.values(REMINDER_CHANNEL));

export const ReminderIntervalSchema = picklist(Object.values(REMINDER_INTERVAL));

export const AttendeeTypeSchema = picklist(Object.values(ATTENDEE_TYPE));

export const AttendeeStatusSchema = picklist(Object.values(ATTENDEE_STATUS));

export const WeekdaySchema = picklist(Object.values(WEEKDAY));

export {
  ATTENDEE_STATUS,
  ATTENDEE_TYPE,
  CALENDAR_ACCESS,
  EVENT_STATUS,
  RECURRENCE_FREQUENCY,
  REMINDER_CHANNEL,
  REMINDER_INTERVAL,
  REMINDER_TARGET,
  REMINDER_TYPE,
  WEEKDAY,
} from "#/utils/constants";
