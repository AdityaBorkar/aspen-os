import { sql } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";

export const label = pgTable(
  "task_label_def",
  {
    color: text("color"),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    name: text("name").notNull(),
    projectId: text("project_id"),
  },
  (table) => [index("idx_task_label_def_project").on(table.projectId)],
);

export type Label = typeof label.$inferSelect;
export type NewLabel = typeof label.$inferInsert;
