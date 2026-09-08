import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { workspaceItemTypeEnum } from "./enums";

export const workspaceWatch = pgTable(
  "workspace_watch",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    item_type: workspaceItemTypeEnum().notNull(),
    user_id: text().notNull(),
  },
  (table) => [
    index("idx_workspace_watch_user").on(table.user_id),
    uniqueIndex("idx_workspace_watch_user_item").on(table.user_id, table.item_type, table.item_id),
  ],
);

export type WorkspaceWatch = typeof workspaceWatch.$inferSelect;
export type NewWorkspaceWatch = typeof workspaceWatch.$inferInsert;
