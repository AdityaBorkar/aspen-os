import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const taskAssignee = pgTable(
  "task_assignee",
  {
    assigned_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    assigned_by: text().notNull(),
    id: uuidv7().primaryKey(),
    is_lead: boolean().notNull().default(false),
    task_id: text().notNull(),
    user_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_assignee_task_user").on(table.task_id, table.user_id),
    index("idx_task_assignee_task").on(table.task_id),
    index("idx_task_assignee_user").on(table.user_id),
  ],
);

export type TaskAssignee = typeof taskAssignee.$inferSelect;
export type NewTaskAssignee = typeof taskAssignee.$inferInsert;
