import {
  calendarReminderChannelEnum,
  calendarReminderTargetEnum,
  calendarReminderTypeEnum,
} from "#/db-schemas/enums";
import type { ReminderInterval } from "#/utils/constants";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const calendarReminder = pgTable(
  "calendar_reminder",
  {
    channel: calendarReminderChannelEnum().notNull().default("pubsub"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    id: uuidv7().primaryKey(),
    interval: text().$type<ReminderInterval | null>(),
    is_recurring: boolean().notNull().default(false),
    is_sent: boolean().notNull().default(false),
    message: text(),
    offset_minutes: integer(),
    remind_at: timestamp({ withTimezone: true }),
    sent_at: timestamp({ withTimezone: true }),
    target_id: text().notNull(),
    target_type: calendarReminderTargetEnum().notNull(),
    type: calendarReminderTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    user_id: text().notNull(),
  },
  (table) => [
    index("idx_calendar_reminder_at").on(table.remind_at),
    index("idx_calendar_reminder_sent").on(table.is_sent),
    index("idx_calendar_reminder_target").on(table.target_type, table.target_id),
    index("idx_calendar_reminder_user").on(table.user_id),
  ],
);

export type CalendarReminder = typeof calendarReminder.$inferSelect;
export type NewCalendarReminder = typeof calendarReminder.$inferInsert;
