import {
  calendarReminderChannelEnum,
  calendarReminderTargetEnum,
  calendarReminderTypeEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const calendarReminder = pgTable(
  "calendar_reminder",
  {
    channel: calendarReminderChannelEnum("channel").notNull().default("pubsub"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    interval: text("interval"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    isSent: boolean("is_sent").notNull().default(false),
    message: text("message"),
    offsetMinutes: integer("offset_minutes"),
    remindAt: timestamp("remind_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    targetId: text("target_id").notNull(),
    targetType: calendarReminderTargetEnum("target_type").notNull(),
    type: calendarReminderTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_calendar_reminder_at").on(table.remindAt),
    index("idx_calendar_reminder_sent").on(table.isSent),
    index("idx_calendar_reminder_target").on(table.targetType, table.targetId),
    index("idx_calendar_reminder_user").on(table.userId),
  ],
);

export type CalendarReminder = typeof calendarReminder.$inferSelect;
export type NewCalendarReminder = typeof calendarReminder.$inferInsert;
