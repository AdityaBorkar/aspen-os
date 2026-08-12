import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text } from "drizzle-orm/pg-core";

export const taskType = pgTable(
  "task_type",
  {
    color: text("color"),
    icon: text("icon"),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    isDefault: boolean("is_default").notNull().default(false),
    name: text("name").notNull(),
    projectId: text("project_id"),
  },
  (table) => [index("idx_task_type_project").on(table.projectId)],
);

export type TaskType = typeof taskType.$inferSelect;
export type NewTaskType = typeof taskType.$inferInsert;
