import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { statusCategoryEnum } from "./enums";

export const status = pgTable(
  "task_status",
  {
    category: statusCategoryEnum("category").notNull(),
    color: text("color"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isDefault: boolean("is_default").notNull().default(false),
    isResolved: boolean("is_resolved").notNull().default(false),
    name: text("name").notNull(),
    projectId: text("project_id"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_task_status_project").on(table.projectId),
    index("idx_task_status_sort").on(table.sortOrder),
  ],
);

export type Status = typeof status.$inferSelect;
export type NewStatus = typeof status.$inferInsert;
