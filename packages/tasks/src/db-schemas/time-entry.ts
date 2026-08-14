import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const timeEntry = pgTable(
  "task_time_entry",
  {
    billable: boolean("billable").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    date: date("date").notNull(),
    description: text("description"),
    duration: integer("duration").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_task_time_entry_task").on(table.taskId),
    index("idx_task_time_entry_user").on(table.userId),
    index("idx_task_time_entry_date").on(table.date),
  ],
);

export type TimeEntry = typeof timeEntry.$inferSelect;
export type NewTimeEntry = typeof timeEntry.$inferInsert;
