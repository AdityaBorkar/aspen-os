import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const timeEntry = pgTable(
  "task_time_entry",
  {
    billable: boolean().notNull().default(false),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    date: date().notNull(),
    description: text(),
    duration: integer().notNull(),
    id: uuidv7().primaryKey(),
    task_id: text().notNull(),
    user_id: text().notNull(),
  },
  (table) => [
    index("idx_task_time_entry_task").on(table.task_id),
    index("idx_task_time_entry_user").on(table.user_id),
    index("idx_task_time_entry_date").on(table.date),
  ],
);

export type TimeEntry = typeof timeEntry.$inferSelect;
export type NewTimeEntry = typeof timeEntry.$inferInsert;
