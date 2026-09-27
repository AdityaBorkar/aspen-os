import { calendarAttendee } from "#/db-schemas/attendee";
import { calendar } from "#/db-schemas/calendar";
import {
  calendarAccessEnum,
  calendarAttendeeStatusEnum,
  calendarAttendeeTypeEnum,
  calendarEventStatusEnum,
  calendarReminderChannelEnum,
  calendarReminderTargetEnum,
  calendarReminderTypeEnum,
} from "#/db-schemas/enums";
import { calendarEvent } from "#/db-schemas/event";
import { calendarReminder } from "#/db-schemas/reminder";

export {
  calendarAccessEnum,
  calendarAttendeeStatusEnum,
  calendarAttendeeTypeEnum,
  calendarEventStatusEnum,
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

// drizzle-kit's push only creates enum types listed as top-level values of
// the schema map, so every enum used by the co-located tables is included
// (same amendment as comms/announcement).
export const tenant_schemas = {
  ...calendarTables,
  calendarAccessEnum,
  calendarAttendeeStatusEnum,
  calendarAttendeeTypeEnum,
  calendarEventStatusEnum,
  calendarReminderChannelEnum,
  calendarReminderTargetEnum,
  calendarReminderTypeEnum,
};
