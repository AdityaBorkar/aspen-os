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
    allDay: boolean("all_day").notNull().default(false),
    calendarId: text("calendar_id").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
    description: text("description"),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    location: text("location"),
    recurrence: jsonb("recurrence").$type<EventRecurrenceRow | null>(),
    sourceEntityId: text("source_entity_id"),
    sourceType: text("source_type"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    status: calendarEventStatusEnum("status").notNull().default("confirmed"),
    timezone: text("timezone"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_calendar_event_calendar").on(table.calendarId),
    index("idx_calendar_event_source").on(table.sourceType, table.sourceEntityId),
    index("idx_calendar_event_starts").on(table.startsAt),
    index("idx_calendar_event_status").on(table.status),
  ],
);

export type CalendarEvent = typeof calendarEvent.$inferSelect;
export type NewCalendarEvent = typeof calendarEvent.$inferInsert;
