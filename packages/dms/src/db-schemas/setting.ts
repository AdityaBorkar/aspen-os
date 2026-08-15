import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsSetting = pgTable(
  "dms_setting",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    key: text("key").notNull().unique(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    value: jsonb("value").notNull().$type<JsonValue>(),
  },
  (table) => [index("idx_dms_setting_key").on(table.key)],
);

export type DmsSetting = typeof dmsSetting.$inferSelect;
export type NewDmsSetting = typeof dmsSetting.$inferInsert;
