export const CALENDAR_ACCESS = {
  GLOBAL: "global",
  PERSONAL: "personal",
} as const;

export type CalendarAccess = (typeof CALENDAR_ACCESS)[keyof typeof CALENDAR_ACCESS];

export const EVENT_STATUS = {
  CANCELLED: "cancelled",
  CONFIRMED: "confirmed",
  TENTATIVE: "tentative",
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const RECURRENCE_FREQUENCY = {
  DAILY: "daily",
  MONTHLY: "monthly",
  WEEKLY: "weekly",
  YEARLY: "yearly",
} as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCY)[keyof typeof RECURRENCE_FREQUENCY];

export const REMINDER_TARGET = {
  CUSTOM: "custom",
  EVENT: "event",
  FILE: "file",
  NOTE: "note",
  TASK: "task",
} as const;

export type ReminderTarget = (typeof REMINDER_TARGET)[keyof typeof REMINDER_TARGET];

export const REMINDER_TYPE = {
  CUSTOM: "custom",
  DUE_DATE: "due_date",
  OFFSET: "offset",
  OVERDUE: "overdue",
} as const;

export type ReminderType = (typeof REMINDER_TYPE)[keyof typeof REMINDER_TYPE];

export const REMINDER_CHANNEL = {
  PUBSUB: "pubsub",
} as const;

export type ReminderChannel = (typeof REMINDER_CHANNEL)[keyof typeof REMINDER_CHANNEL];

export const ATTENDEE_TYPE = {
  CONTACT: "contact",
  USER: "user",
} as const;

export type AttendeeType = (typeof ATTENDEE_TYPE)[keyof typeof ATTENDEE_TYPE];

export const ATTENDEE_STATUS = {
  ACCEPTED: "accepted",
  DECLINED: "declined",
  INVITED: "invited",
  TENTATIVE: "tentative",
} as const;

export type AttendeeStatus = (typeof ATTENDEE_STATUS)[keyof typeof ATTENDEE_STATUS];

export const REMINDER_INTERVAL = {
  DAILY: "daily",
  EVERY_2_HOURS: "every_2_hours",
  MONTHLY: "monthly",
  WEEKLY: "weekly",
} as const;

export type ReminderInterval = (typeof REMINDER_INTERVAL)[keyof typeof REMINDER_INTERVAL];

export const WEEKDAY = {
  FRIDAY: "FR",
  MONDAY: "MO",
  SATURDAY: "SA",
  SUNDAY: "SU",
  THURSDAY: "TH",
  TUESDAY: "TU",
  WEDNESDAY: "WE",
} as const;

export type Weekday = (typeof WEEKDAY)[keyof typeof WEEKDAY];

export const DEFAULT_CALENDAR_TIMEZONE = "UTC";

export const SCHEDULED_JOBS = {
  REMINDER_SCAN: "calendar:reminder-scan",
} as const;

export type ScheduledJob = (typeof SCHEDULED_JOBS)[keyof typeof SCHEDULED_JOBS];

export const AUDIT_ENTITY_TYPE = {
  ATTENDEE: "calendar:attendee",
  CALENDAR: "calendar:calendar",
  EVENT: "calendar:event",
  REMINDER: "calendar:reminder",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  CANCELLED: "cancelled",
  CREATED: "created",
  DELETED: "deleted",
  INVITED: "invited",
  PROCESSED: "processed",
  REMOVED: "removed",
  SET_DEFAULT: "set_default",
  UPDATED: "updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];
