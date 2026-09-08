import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const workspaceSetting = pgTable(
  "workspace_setting",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    key: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    user_id: text().notNull(),
    value: jsonb().notNull().$type<JsonValue>(),
  },
  (table) => [
    index("idx_workspace_setting_user").on(table.user_id),
    uniqueIndex("idx_workspace_setting_user_key").on(table.user_id, table.key),
  ],
);

export type WorkspaceSetting = typeof workspaceSetting.$inferSelect;
export type NewWorkspaceSetting = typeof workspaceSetting.$inferInsert;
