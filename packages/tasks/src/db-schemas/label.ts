import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text } from "drizzle-orm/pg-core";

export const label = pgTable(
  "task_label_def",
  {
    color: text(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    project_id: text(),
  },
  (table) => [index("idx_task_label_def_project").on(table.project_id)],
);

export type Label = typeof label.$inferSelect;
export type NewLabel = typeof label.$inferInsert;
