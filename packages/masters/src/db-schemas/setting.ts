import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * Key–value settings store for the whole tenant. `user_id` is null for
 * tenant-wide rows (org.* keys); per-user rows scope the key to that user.
 */
export const masterSetting = pgTable(
  "master_setting",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    key: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    user_id: text(),
    value: jsonb().notNull().$type<JsonValue>(),
  },
  (table) => [
    index("idx_master_setting_user").on(table.user_id),
    // NULLS NOT DISTINCT keeps tenant-wide rows (user_id null) unique per key.
    unique("uq_master_setting_user_key").on(table.user_id, table.key).nullsNotDistinct(),
  ],
);

export type MasterSetting = typeof masterSetting.$inferSelect;
export type NewMasterSetting = typeof masterSetting.$inferInsert;
