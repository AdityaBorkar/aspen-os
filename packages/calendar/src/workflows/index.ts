import { addAttendee } from "#/workflows/attendee/add";
import { getAttendee } from "#/workflows/attendee/get";
import { listAttendees } from "#/workflows/attendee/list";
import { removeAttendee } from "#/workflows/attendee/remove";
import { updateAttendee } from "#/workflows/attendee/update";
import { createCalendar } from "#/workflows/calendar/create";
import { deleteCalendar } from "#/workflows/calendar/delete";
import { getCalendar } from "#/workflows/calendar/get";
import { listCalendars } from "#/workflows/calendar/list";
import { setDefaultCalendar } from "#/workflows/calendar/set-default";
import { updateCalendar } from "#/workflows/calendar/update";
import { cancelEvent } from "#/workflows/event/cancel";
import { createEvent } from "#/workflows/event/create";
import { deleteEvent } from "#/workflows/event/delete";
import { getEvent } from "#/workflows/event/get";
import { getEventOccurrences } from "#/workflows/event/get-occurrences";
import { listEvents } from "#/workflows/event/list";
import { listEventOccurrences } from "#/workflows/event/list-occurrences";
import { updateEvent } from "#/workflows/event/update";
import { createReminder } from "#/workflows/reminder/create";
import { deleteReminder } from "#/workflows/reminder/delete";
import { getReminder } from "#/workflows/reminder/get";
import { getPendingReminders } from "#/workflows/reminder/get-pending";
import { listReminders } from "#/workflows/reminder/list";
import { processPendingReminders } from "#/workflows/reminder/process-pending";
import { updateReminder } from "#/workflows/reminder/update";

export const attendees = {
  add: addAttendee,
  get: getAttendee,
  list: listAttendees,
  remove: removeAttendee,
  update: updateAttendee,
} as const;

export const calendars = {
  create: createCalendar,
  delete: deleteCalendar,
  get: getCalendar,
  list: listCalendars,
  setDefault: setDefaultCalendar,
  update: updateCalendar,
} as const;

export const events = {
  cancel: cancelEvent,
  create: createEvent,
  delete: deleteEvent,
  get: getEvent,
  getOccurrences: getEventOccurrences,
  list: listEvents,
  listOccurrences: listEventOccurrences,
  update: updateEvent,
} as const;

export const reminders = {
  create: createReminder,
  delete: deleteReminder,
  get: getReminder,
  getPending: getPendingReminders,
  list: listReminders,
  processPending: processPendingReminders,
  update: updateReminder,
} as const;
