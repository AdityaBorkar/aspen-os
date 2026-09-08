import { projectStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const project = pgTable(
  "task_project",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    default_task_type_id: text(),
    description: text(),
    id: uuidv7().primaryKey(),
    key: text().notNull().unique(),
    lead_id: text().notNull(),
    name: text().notNull(),
    start_date: timestamp({ withTimezone: true }),
    status: projectStatusEnum().notNull().default("active"),
    target_date: timestamp({ withTimezone: true }),
    task_counter: integer().notNull().default(0),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_task_project_lead").on(table.lead_id),
    index("idx_task_project_status").on(table.status),
  ],
);

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
