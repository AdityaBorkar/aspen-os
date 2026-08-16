import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const workspaceSetting = pgTable(
  "workspace_setting",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    key: text("key").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    userId: text("user_id").notNull(),
    value: jsonb("value").notNull().$type<JsonValue>(),
  },
  (table) => [
    index("idx_workspace_setting_user").on(table.userId),
    uniqueIndex("idx_workspace_setting_user_key").on(table.userId, table.key),
  ],
);

export type WorkspaceSetting = typeof workspaceSetting.$inferSelect;
export type NewWorkspaceSetting = typeof workspaceSetting.$inferInsert;
