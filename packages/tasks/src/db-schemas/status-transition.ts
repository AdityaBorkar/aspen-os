import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  index,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const statusTransition = pgTable(
  "task_status_transition",
  {
    fromStatusId: text("from_status_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    projectId: text("project_id").notNull(),
    requiresComment: boolean("requires_comment").notNull().default(false),
    requiresRole: text("requires_role"),
    toStatusId: text("to_status_id").notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_status_transition").on(
      table.fromStatusId,
      table.toStatusId,
      table.projectId,
    ),
    index("idx_task_status_transition_project").on(table.projectId),
  ],
);

export type StatusTransition = typeof statusTransition.$inferSelect;
export type NewStatusTransition = typeof statusTransition.$inferInsert;
