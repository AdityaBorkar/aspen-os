import { calendarAttendeeStatusEnum, calendarAttendeeTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const calendarAttendee = pgTable(
  "calendar_attendee",
  {
    attendee_id: text(),
    attendee_type: calendarAttendeeTypeEnum().notNull().default("user"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    email: text().notNull(),
    event_id: text().notNull(),
    id: uuidv7().primaryKey(),
    name: text(),
    optional: boolean().notNull().default(false),
    status: calendarAttendeeStatusEnum().notNull().default("invited"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_calendar_attendee_email").on(table.email),
    index("idx_calendar_attendee_event").on(table.event_id),
  ],
);

export type CalendarAttendee = typeof calendarAttendee.$inferSelect;
export type NewCalendarAttendee = typeof calendarAttendee.$inferInsert;
