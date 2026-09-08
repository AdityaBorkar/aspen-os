import {
  commsChannelSourceEnum,
  commsChannelStatusEnum,
  commsChannelTypeEnum,
} from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsChannel = pgTable(
  "comms_channel",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    credential_ref: text(),
    entity_id: text().notNull(),
    entity_type: text().notNull(),
    id: uuidv7().primaryKey(),
    is_default: boolean().notNull().default(false),
    last_tested_at: timestamp({ withTimezone: true }),
    last_used_at: timestamp({ withTimezone: true }),
    metadata: jsonb().$type<Record<string, JsonValue> | null>(),
    name: text().notNull(),
    provider_id: text(),
    sender_address: text().notNull(),
    source: commsChannelSourceEnum().notNull(),
    status: commsChannelStatusEnum().notNull().default("inactive"),
    type: commsChannelTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    verified_at: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("idx_comms_channel_scope").on(table.entity_type, table.entity_id),
    index("idx_comms_channel_type").on(table.type),
    index("idx_comms_channel_status").on(table.status),
    index("idx_comms_channel_provider").on(table.provider_id),
  ],
);

export type CommsChannel = typeof commsChannel.$inferSelect;
export type NewCommsChannel = typeof commsChannel.$inferInsert;
