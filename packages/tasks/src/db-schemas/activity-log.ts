import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const activityLog = pgTable(
  "task_activity_log",
  {
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    newValue: jsonb("new_value"),
    oldValue: jsonb("old_value"),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_task_activity_log_task").on(table.taskId),
    index("idx_task_activity_log_action").on(table.action),
    index("idx_task_activity_log_created").on(table.createdAt),
  ],
);

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
