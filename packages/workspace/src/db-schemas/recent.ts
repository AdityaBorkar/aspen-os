import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { workspaceItemTypeEnum } from "./enums";

export const workspaceRecent = pgTable(
  "workspace_recent",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    item_type: workspaceItemTypeEnum().notNull(),
    last_accessed_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    user_id: text().notNull(),
  },
  (table) => [
    index("idx_workspace_recent_user").on(table.user_id),
    uniqueIndex("idx_workspace_recent_user_item").on(table.user_id, table.item_type, table.item_id),
  ],
);

export type WorkspaceRecent = typeof workspaceRecent.$inferSelect;
export type NewWorkspaceRecent = typeof workspaceRecent.$inferInsert;
