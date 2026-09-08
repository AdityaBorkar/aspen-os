import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text } from "drizzle-orm/pg-core";

export const taskType = pgTable(
  "task_type",
  {
    color: text(),
    icon: text(),
    id: uuidv7().primaryKey(),
    is_default: boolean().notNull().default(false),
    name: text().notNull(),
    project_id: text(),
  },
  (table) => [index("idx_task_type_project").on(table.project_id)],
);

export type TaskType = typeof taskType.$inferSelect;
export type NewTaskType = typeof taskType.$inferInsert;
