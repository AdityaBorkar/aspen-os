import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const watcher = pgTable(
  "task_watcher",
  {
    added_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    task_id: text().notNull(),
    user_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_watcher_task_user").on(table.task_id, table.user_id),
    index("idx_task_watcher_task").on(table.task_id),
    index("idx_task_watcher_user").on(table.user_id),
  ],
);

export type Watcher = typeof watcher.$inferSelect;
export type NewWatcher = typeof watcher.$inferInsert;
