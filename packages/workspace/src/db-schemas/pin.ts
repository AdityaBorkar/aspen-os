import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { workspaceItemTypeEnum } from "./enums";

export const workspacePin = pgTable(
  "workspace_pin",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    itemId: text("item_id").notNull(),
    itemType: workspaceItemTypeEnum("item_type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_workspace_pin_user").on(table.userId),
    uniqueIndex("idx_workspace_pin_user_item").on(table.userId, table.itemType, table.itemId),
  ],
);

export type WorkspacePin = typeof workspacePin.$inferSelect;
export type NewWorkspacePin = typeof workspacePin.$inferInsert;
