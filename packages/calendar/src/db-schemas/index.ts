import { calendarAttendee } from "#/db-schemas/attendee";
import { calendar } from "#/db-schemas/calendar";
import { calendarEvent } from "#/db-schemas/event";
import { calendarReminder } from "#/db-schemas/reminder";

export {
  calendarAccessEnum,
  calendarAttendeeStatusEnum,
  calendarAttendeeTypeEnum,
  calendarEventStatusEnum,
  calendarRecurrenceFrequencyEnum,
  calendarReminderChannelEnum,
  calendarReminderTargetEnum,
  calendarReminderTypeEnum,
} from "#/db-schemas/enums";
export { calendar } from "#/db-schemas/calendar";
export { calendarAttendee } from "#/db-schemas/attendee";
export { calendarEvent } from "#/db-schemas/event";
export { calendarReminder } from "#/db-schemas/reminder";

export const calendarTables = {
  calendar,
  calendarAttendee,
  calendarEvent,
  calendarReminder,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = calendarTables;
