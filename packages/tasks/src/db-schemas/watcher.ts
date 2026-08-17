import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const watcher = pgTable(
  "task_watcher",
  {
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuidv7("id").primaryKey(),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_watcher_task_user").on(table.taskId, table.userId),
    index("idx_task_watcher_task").on(table.taskId),
    index("idx_task_watcher_user").on(table.userId),
  ],
);

export type Watcher = typeof watcher.$inferSelect;
export type NewWatcher = typeof watcher.$inferInsert;
