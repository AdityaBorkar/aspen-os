import { calendarEventStatusEnum } from "#/db-schemas/enums";
import type { RecurrenceFrequency, Weekday } from "#/utils/constants";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export interface EventRecurrenceRow {
  byDay?: Weekday[];
  count?: number;
  frequency: RecurrenceFrequency;
  interval?: number;
  until?: string;
}

export const calendarEvent = pgTable(
  "calendar_event",
  {
    all_day: boolean().notNull().default(false),
    calendar_id: text().notNull(),
    color: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    description: text(),
    ends_at: timestamp({ withTimezone: true }),
    id: uuidv7().primaryKey(),
    location: text(),
    recurrence: jsonb().$type<EventRecurrenceRow | null>(),
    source_entity_id: text(),
    source_type: text(),
    starts_at: timestamp({ withTimezone: true }).notNull(),
    status: calendarEventStatusEnum().notNull().default("confirmed"),
    timezone: text(),
    title: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_calendar_event_calendar").on(table.calendar_id),
    index("idx_calendar_event_source").on(table.source_type, table.source_entity_id),
    index("idx_calendar_event_starts").on(table.starts_at),
    index("idx_calendar_event_status").on(table.status),
  ],
);

export type CalendarEvent = typeof calendarEvent.$inferSelect;
export type NewCalendarEvent = typeof calendarEvent.$inferInsert;
