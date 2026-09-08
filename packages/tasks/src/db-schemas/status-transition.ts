import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const statusTransition = pgTable(
  "task_status_transition",
  {
    from_status_id: text().notNull(),
    id: uuidv7().primaryKey(),
    project_id: text().notNull(),
    requires_comment: boolean().notNull().default(false),
    requires_role: text(),
    to_status_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_status_transition").on(
      table.from_status_id,
      table.to_status_id,
      table.project_id,
    ),
    index("idx_task_status_transition_project").on(table.project_id),
  ],
);

export type StatusTransition = typeof statusTransition.$inferSelect;
export type NewStatusTransition = typeof statusTransition.$inferInsert;
