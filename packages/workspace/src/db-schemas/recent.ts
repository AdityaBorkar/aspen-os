import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { workspaceItemTypeEnum } from "./enums";

export const workspaceRecent = pgTable(
  "workspace_recent",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    itemId: text("item_id").notNull(),
    itemType: workspaceItemTypeEnum("item_type").notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_workspace_recent_user").on(table.userId),
    uniqueIndex("idx_workspace_recent_user_item").on(table.userId, table.itemType, table.itemId),
  ],
);

export type WorkspaceRecent = typeof workspaceRecent.$inferSelect;
export type NewWorkspaceRecent = typeof workspaceRecent.$inferInsert;
