export type { CalendarAttendee, NewCalendarAttendee } from "#/db-schemas/attendee";
export type { CalendarEvent, NewCalendarEvent, EventRecurrenceRow } from "#/db-schemas/event";
export type { CalendarReminder, NewCalendarReminder } from "#/db-schemas/reminder";
export type {
  AttendeeEventMap,
  AttendeeInvitedEvent,
  AttendeePayload,
  AttendeeRemovedEvent,
  AttendeeUpdatedEvent,
  CalendarEventPayload,
  CalendarModuleEventMap,
  EventCancelledEvent,
  EventCreatedEvent,
  EventDeletedEvent,
  EventEventMap,
  EventUpdatedEvent,
  ReminderCreatedEvent,
  ReminderDeletedEvent,
  ReminderDueEvent,
  ReminderEventMap,
  ReminderPayload,
  ReminderUpdatedEvent,
} from "#/pubsub";
export { ATTENDEE_EVENTS, EVENT_EVENTS, REMINDER_EVENTS, events } from "#/pubsub";
export type {
  AttendeeFilters,
  CreateAttendeeInput,
  CreateEventInput,
  CreateReminderInput,
  EventFilters,
  EventRecurrence,
  OccurrencesQuery,
  ReminderFilters,
  UpdateAttendeeInput,
  UpdateEventInput,
  UpdateReminderInput,
} from "#/schemas";
export {
  AttendeeFiltersSchema,
  AttendeeStatusSchema,
  AttendeeTypeSchema,
  CalendarAudienceTypeSchema,
  CreateAttendeeSchema,
  CreateEventSchema,
  CreateReminderSchema,
  EmailSchema,
  EventFiltersSchema,
  EventRecurrenceSchema,
  EventStatusSchema,
  HexColorSchema,
  IdSchema,
  NameSchema,
  OccurrencesQuerySchema,
  RecurrenceFrequencySchema,
  ReminderChannelSchema,
  ReminderFiltersSchema,
  ReminderIntervalSchema,
  ReminderTargetSchema,
  ReminderTypeSchema,
  ScopeTypeSchema,
  TARGETS_REQUIRING_ID,
  TimezoneSchema,
  UpdateAttendeeSchema,
  UpdateEventSchema,
  UpdateReminderSchema,
  WeekdaySchema,
  WithIdSchema,
} from "#/schemas";
export type { Occurrence } from "#/workflow-steps/recurrence";
export type {
  AuditAction,
  AttendeeStatus,
  AttendeeType,
  CalendarAudienceType,
  EventStatus,
  RecurrenceFrequency,
  ReminderChannel,
  ReminderInterval,
  ReminderTarget,
  ReminderType,
  ScheduledJob,
  Weekday,
} from "#/utils/constants";
export {
  ATTENDEE_STATUS,
  ATTENDEE_TYPE,
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  CALENDAR_AUDIENCE,
  EVENT_STATUS,
  RECURRENCE_FREQUENCY,
  REMINDER_CHANNEL,
  REMINDER_INTERVAL,
  REMINDER_TARGET,
  REMINDER_TYPE,
  SCHEDULED_JOBS,
  WEEKDAY,
} from "#/utils/constants";

export interface CalendarModuleConfig {
  complianceEnabled?: boolean;
  healthcareEnabled?: boolean;
  reminderScanCron?: string;
  /**
   * Subscribe to `task.*` events for the task-reminder bridge. Disable when
   * the tasks module is not installed; subscription errors otherwise
   * propagate instead of being silently swallowed.
   */
  tasksEnabled?: boolean;
}
