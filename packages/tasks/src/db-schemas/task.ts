import { taskPriorityEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const task = pgTable(
  "task",
  {
    assigned_at: timestamp({ withTimezone: true }),
    completed_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    due_date: timestamp({ withTimezone: true }),
    estimated_hours: numeric(),
    id: uuidv7().primaryKey(),
    is_archived: boolean().notNull().default(false),
    labels: text().array().default([]),
    number: text(),
    parent_id: text(),
    priority: taskPriorityEnum().notNull().default("none"),
    project_id: text().notNull(),
    reporter_id: text().notNull(),
    sort_order: integer().notNull().default(0),
    start_date: timestamp({ withTimezone: true }),
    status_id: text().notNull(),
    task_number: integer(),
    title: text().notNull(),
    type_id: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_task_project").on(table.project_id),
    index("idx_task_status").on(table.status_id),
    index("idx_task_type").on(table.type_id),
    index("idx_task_parent").on(table.parent_id),
    index("idx_task_reporter").on(table.reporter_id),
    index("idx_task_priority").on(table.priority),
    index("idx_task_archived").on(table.is_archived),
    index("idx_task_due_date").on(table.due_date),
  ],
);

export type Task = typeof task.$inferSelect;
export type NewTask = typeof task.$inferInsert;
