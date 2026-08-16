import { commsPreferenceChannelTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsPreference = pgTable(
  "comms_preference",
  {
    channelType: commsPreferenceChannelTypeEnum("channel_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    enabled: boolean("enabled").notNull().default(true),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    priority: integer("priority").notNull().default(0),
    type: text("type"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").notNull(),
  },
  (table) => [index("idx_comms_preference_user").on(table.userId, table.type, table.channelType)],
);

export type CommsPreference = typeof commsPreference.$inferSelect;
export type NewCommsPreference = typeof commsPreference.$inferInsert;
