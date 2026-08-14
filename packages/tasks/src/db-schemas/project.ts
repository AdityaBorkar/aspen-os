import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { projectStatusEnum } from "./enums";

export const project = pgTable(
  "task_project",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    defaultTaskTypeId: text("default_task_type_id"),
    description: text("description"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    key: text("key").notNull().unique(),
    leadId: text("lead_id").notNull(),
    name: text("name").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }),
    status: projectStatusEnum("status").notNull().default("active"),
    targetDate: timestamp("target_date", { withTimezone: true }),
    taskCounter: integer("task_counter").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_task_project_lead").on(table.leadId),
    index("idx_task_project_status").on(table.status),
  ],
);

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
