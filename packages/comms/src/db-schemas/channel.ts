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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    credentialRef: text("credential_ref"),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    id: uuidv7("id").primaryKey(),
    isDefault: boolean("is_default").notNull().default(false),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, JsonValue> | null>(),
    name: text("name").notNull(),
    providerId: text("provider_id"),
    senderAddress: text("sender_address").notNull(),
    source: commsChannelSourceEnum("source").notNull(),
    status: commsChannelStatusEnum("status").notNull().default("inactive"),
    type: commsChannelTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_comms_channel_scope").on(table.entityType, table.entityId),
    index("idx_comms_channel_type").on(table.type),
    index("idx_comms_channel_status").on(table.status),
    index("idx_comms_channel_provider").on(table.providerId),
  ],
);

export type CommsChannel = typeof commsChannel.$inferSelect;
export type NewCommsChannel = typeof commsChannel.$inferInsert;
