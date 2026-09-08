import { savedViewTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text } from "drizzle-orm/pg-core";

export const savedView = pgTable(
  "task_saved_view",
  {
    filters: jsonb(),
    group_by: text(),
    id: uuidv7().primaryKey(),
    is_default: boolean().notNull().default(false),
    is_shared: boolean().notNull().default(false),
    name: text().notNull(),
    owner_id: text().notNull(),
    project_id: text(),
    sort: jsonb(),
    type: savedViewTypeEnum().notNull().default("list"),
  },
  (table) => [
    index("idx_task_saved_view_owner").on(table.owner_id),
    index("idx_task_saved_view_project").on(table.project_id),
  ],
);

export type SavedView = typeof savedView.$inferSelect;
export type NewSavedView = typeof savedView.$inferInsert;
