import { statusCategoryEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text } from "drizzle-orm/pg-core";

export const status = pgTable(
  "task_status",
  {
    category: statusCategoryEnum().notNull(),
    color: text(),
    id: uuidv7().primaryKey(),
    is_default: boolean().notNull().default(false),
    is_resolved: boolean().notNull().default(false),
    name: text().notNull(),
    project_id: text(),
    sort_order: integer().notNull().default(0),
  },
  (table) => [
    index("idx_task_status_project").on(table.project_id),
    index("idx_task_status_sort").on(table.sort_order),
  ],
);

export type Status = typeof status.$inferSelect;
export type NewStatus = typeof status.$inferInsert;
