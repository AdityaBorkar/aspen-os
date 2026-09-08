import { commsChannelTypeEnum, commsMessageStatusEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsMessage = pgTable(
  "message",
  {
    attempts: integer().notNull().default(0),
    body: text().notNull(),
    channel_id: text(),
    channel_type: commsChannelTypeEnum().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    delivered_at: timestamp({ withTimezone: true }),
    id: uuidv7().primaryKey(),
    last_error: text(),
    metadata: jsonb().$type<Record<string, JsonValue> | null>(),
    notification_id: text(),
    provider_id: text(),
    provider_message_id: text(),
    queued_at: timestamp({ withTimezone: true }),
    sent_at: timestamp({ withTimezone: true }),
    status: commsMessageStatusEnum().notNull().default("queued"),
    subject: text(),
    template_id: text(),
    tenant_id: text(),
    to: text().notNull(),
  },
  (table) => [
    index("idx_message_status").on(table.status),
    index("idx_message_channel").on(table.channel_id),
    index("idx_message_notification").on(table.notification_id),
    index("idx_message_provider").on(table.provider_message_id),
    index("idx_message_created").on(table.created_at),
    index("idx_message_tenant").on(table.tenant_id),
  ],
);

export type CommsMessage = typeof commsMessage.$inferSelect;
export type NewCommsMessage = typeof commsMessage.$inferInsert;
