import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const taskAssignee = pgTable(
  "task_assignee",
  {
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    assignedBy: text("assigned_by").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isLead: boolean("is_lead").notNull().default(false),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_assignee_task_user").on(table.taskId, table.userId),
    index("idx_task_assignee_task").on(table.taskId),
    index("idx_task_assignee_user").on(table.userId),
  ],
);

export type TaskAssignee = typeof taskAssignee.$inferSelect;
export type NewTaskAssignee = typeof taskAssignee.$inferInsert;
