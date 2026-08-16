import { commsChannelTypeEnum, commsMessageStatusEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsMessage = pgTable(
  "comms_message",
  {
    attempts: integer("attempts").notNull().default(0),
    body: text("body").notNull(),
    channelId: text("channel_id"),
    channelType: commsChannelTypeEnum("channel_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    lastError: text("last_error"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue> | null>(),
    notificationId: text("notification_id"),
    providerId: text("provider_id"),
    providerMessageId: text("provider_message_id"),
    queuedAt: timestamp("queued_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: commsMessageStatusEnum("status").notNull().default("queued"),
    subject: text("subject"),
    templateId: text("template_id"),
    to: text("to").notNull(),
  },
  (table) => [
    index("idx_comms_message_status").on(table.status),
    index("idx_comms_message_channel").on(table.channelId),
    index("idx_comms_message_notification").on(table.notificationId),
    index("idx_comms_message_provider").on(table.providerMessageId),
    index("idx_comms_message_created").on(table.createdAt),
  ],
);

export type CommsMessage = typeof commsMessage.$inferSelect;
export type NewCommsMessage = typeof commsMessage.$inferInsert;
