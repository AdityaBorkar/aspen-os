import { commsChannelTypeEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsTemplate = pgTable(
  "comms_template",
  {
    body: text().notNull(),
    channel_type: commsChannelTypeEnum().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    metadata: jsonb().$type<Record<string, JsonValue> | null>(),
    name: text().notNull(),
    provider_template_id: text(),
    subject: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_comms_template_channel_name").on(table.channel_type, table.name)],
);

export type CommsTemplate = typeof commsTemplate.$inferSelect;
export type NewCommsTemplate = typeof commsTemplate.$inferInsert;
