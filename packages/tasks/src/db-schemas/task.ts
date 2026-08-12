import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { taskPriorityEnum } from "./enums";

export const task = pgTable(
  "task",
  {
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    estimatedHours: numeric("estimated_hours"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isArchived: boolean("is_archived").notNull().default(false),
    labels: text("labels").array().default([]),
    number: text("number"),
    parentId: text("parent_id"),
    priority: taskPriorityEnum("priority").notNull().default("none"),
    projectId: text("project_id").notNull(),
    reporterId: text("reporter_id").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    startDate: timestamp("start_date", { withTimezone: true }),
    statusId: text("status_id").notNull(),
    taskNumber: integer("task_number"),
    title: text("title").notNull(),
    typeId: text("type_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_task_project").on(table.projectId),
    index("idx_task_status").on(table.statusId),
    index("idx_task_type").on(table.typeId),
    index("idx_task_parent").on(table.parentId),
    index("idx_task_reporter").on(table.reporterId),
    index("idx_task_priority").on(table.priority),
    index("idx_task_archived").on(table.isArchived),
    index("idx_task_due_date").on(table.dueDate),
  ],
);

export type Task = typeof task.$inferSelect;
export type NewTask = typeof task.$inferInsert;
