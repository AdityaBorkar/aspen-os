import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsSetting = pgTable(
  "comms_setting",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuidv7("id").primaryKey(),
    key: text("key").notNull().unique(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    value: jsonb("value").notNull().$type<JsonValue>(),
  },
  (table) => [index("idx_comms_setting_key").on(table.key)],
);

export type CommsSetting = typeof commsSetting.$inferSelect;
export type NewCommsSetting = typeof commsSetting.$inferInsert;
