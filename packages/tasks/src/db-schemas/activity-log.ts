import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const activityLog = pgTable(
  "task_activity_log",
  {
    action: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    new_value: jsonb(),
    old_value: jsonb(),
    task_id: text().notNull(),
    user_id: text().notNull(),
  },
  (table) => [
    index("idx_task_activity_log_task").on(table.task_id),
    index("idx_task_activity_log_action").on(table.action),
    index("idx_task_activity_log_created").on(table.created_at),
  ],
);

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
