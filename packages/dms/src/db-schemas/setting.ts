import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsSetting = pgTable(
  "dms_setting",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    key: text().notNull().unique(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    value: jsonb().notNull().$type<JsonValue>(),
  },
  (table) => [index("idx_dms_setting_key").on(table.key)],
);

export type DmsSetting = typeof dmsSetting.$inferSelect;
export type NewDmsSetting = typeof dmsSetting.$inferInsert;
