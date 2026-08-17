import { savedViewTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text } from "drizzle-orm/pg-core";

export const savedView = pgTable(
  "task_saved_view",
  {
    filters: jsonb("filters"),
    groupBy: text("group_by"),
    id: uuidv7("id").primaryKey(),
    isDefault: boolean("is_default").notNull().default(false),
    isShared: boolean("is_shared").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    projectId: text("project_id"),
    sort: jsonb("sort"),
    type: savedViewTypeEnum("type").notNull().default("list"),
  },
  (table) => [
    index("idx_task_saved_view_owner").on(table.ownerId),
    index("idx_task_saved_view_project").on(table.projectId),
  ],
);

export type SavedView = typeof savedView.$inferSelect;
export type NewSavedView = typeof savedView.$inferInsert;
