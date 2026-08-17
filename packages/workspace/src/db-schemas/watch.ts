import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { workspaceItemTypeEnum } from "./enums";

export const workspaceWatch = pgTable(
  "workspace_watch",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuidv7("id").primaryKey(),
    itemId: text("item_id").notNull(),
    itemType: workspaceItemTypeEnum("item_type").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_workspace_watch_user").on(table.userId),
    uniqueIndex("idx_workspace_watch_user_item").on(table.userId, table.itemType, table.itemId),
  ],
);

export type WorkspaceWatch = typeof workspaceWatch.$inferSelect;
export type NewWorkspaceWatch = typeof workspaceWatch.$inferInsert;
