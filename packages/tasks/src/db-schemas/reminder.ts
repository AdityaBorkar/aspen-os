import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { reminderTypeEnum } from "./enums";

export const reminder = pgTable(
  "task_reminder",
  {
    id: text("id").primaryKey().$defaultFn(uuidv7),
    interval: text("interval"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    isSent: boolean("is_sent").notNull().default(false),
    message: text("message"),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    taskId: text("task_id").notNull(),
    type: reminderTypeEnum("type").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_task_reminder_task").on(table.taskId),
    index("idx_task_reminder_user").on(table.userId),
    index("idx_task_reminder_sent").on(table.isSent),
    index("idx_task_reminder_at").on(table.remindAt),
  ],
);

export type Reminder = typeof reminder.$inferSelect;
export type NewReminder = typeof reminder.$inferInsert;
