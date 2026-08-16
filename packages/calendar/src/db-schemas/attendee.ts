import { calendarAttendeeStatusEnum, calendarAttendeeTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const calendarAttendee = pgTable(
  "calendar_attendee",
  {
    attendeeId: text("attendee_id"),
    attendeeType: calendarAttendeeTypeEnum("attendee_type").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    email: text("email").notNull(),
    eventId: text("event_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    name: text("name"),
    optional: boolean("optional").notNull().default(false),
    status: calendarAttendeeStatusEnum("status").notNull().default("invited"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_calendar_attendee_email").on(table.email),
    index("idx_calendar_attendee_event").on(table.eventId),
  ],
);

export type CalendarAttendee = typeof calendarAttendee.$inferSelect;
export type NewCalendarAttendee = typeof calendarAttendee.$inferInsert;
