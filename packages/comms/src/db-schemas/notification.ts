import {
  commsNotificationSeverityEnum,
  commsNotificationStatusEnum,
  commsRecipientTypeEnum,
} from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsNotification = pgTable(
  "comms_notification",
  {
    body: text(),
    channel_types: text().array().notNull().default([]),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    metadata: jsonb().$type<Record<string, JsonValue> | null>(),
    read_at: timestamp({ withTimezone: true }),
    recipient_id: text().notNull(),
    recipient_type: commsRecipientTypeEnum().notNull(),
    severity: commsNotificationSeverityEnum().notNull().default("normal"),
    source_entity: jsonb().$type<{ id: string; type: string } | null>(),
    source_module: text().notNull(),
    status: commsNotificationStatusEnum().notNull().default("unread"),
    title: text().notNull(),
    to: jsonb().$type<{ email?: string; name?: string; phone?: string } | null>(),
    type: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_comms_notification_recipient").on(table.recipient_type, table.recipient_id),
    index("idx_comms_notification_status").on(table.status),
    index("idx_comms_notification_type").on(table.type),
    index("idx_comms_notification_created").on(table.created_at),
  ],
);

export type CommsNotification = typeof commsNotification.$inferSelect;
export type NewCommsNotification = typeof commsNotification.$inferInsert;
