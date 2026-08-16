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
    body: text("body"),
    channelTypes: text("channel_types").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    metadata: jsonb("metadata").$type<Record<string, JsonValue> | null>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    recipientId: text("recipient_id").notNull(),
    recipientType: commsRecipientTypeEnum("recipient_type").notNull(),
    severity: commsNotificationSeverityEnum("severity").notNull().default("normal"),
    sourceEntity: jsonb("source_entity").$type<{ id: string; type: string } | null>(),
    sourceModule: text("source_module").notNull(),
    status: commsNotificationStatusEnum("status").notNull().default("unread"),
    title: text("title").notNull(),
    to: jsonb("to").$type<{ email?: string; name?: string; phone?: string } | null>(),
    type: text("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_comms_notification_recipient").on(table.recipientType, table.recipientId),
    index("idx_comms_notification_status").on(table.status),
    index("idx_comms_notification_type").on(table.type),
    index("idx_comms_notification_created").on(table.createdAt),
  ],
);

export type CommsNotification = typeof commsNotification.$inferSelect;
export type NewCommsNotification = typeof commsNotification.$inferInsert;
