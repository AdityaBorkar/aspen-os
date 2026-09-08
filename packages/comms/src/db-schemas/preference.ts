import { commsPreferenceChannelTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsPreference = pgTable(
  "preference",
  {
    channel_type: commsPreferenceChannelTypeEnum().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    enabled: boolean().notNull().default(true),
    id: uuidv7().primaryKey(),
    priority: integer().notNull().default(0),
    type: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    user_id: text().notNull(),
  },
  (table) => [index("idx_preference_user").on(table.user_id, table.type, table.channel_type)],
);

export type CommsPreference = typeof commsPreference.$inferSelect;
export type NewCommsPreference = typeof commsPreference.$inferInsert;
