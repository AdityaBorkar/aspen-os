import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const workspacePin = pgTable(
  "workspace_pin",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    item_type: text().notNull(),
    sort_order: integer().notNull().default(0),
    user_id: text().notNull(),
  },
  (table) => [
    index("idx_workspace_pin_user").on(table.user_id),
    uniqueIndex("idx_workspace_pin_user_item").on(table.user_id, table.item_type, table.item_id),
  ],
);

export type WorkspacePin = typeof workspacePin.$inferSelect;
export type NewWorkspacePin = typeof workspacePin.$inferInsert;
