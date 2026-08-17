import { commsChannelTypeEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsTemplate = pgTable(
  "comms_template",
  {
    body: text("body").notNull(),
    channelType: commsChannelTypeEnum("channel_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, JsonValue> | null>(),
    name: text("name").notNull(),
    providerTemplateId: text("provider_template_id"),
    subject: text("subject"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_comms_template_channel_name").on(table.channelType, table.name)],
);

export type CommsTemplate = typeof commsTemplate.$inferSelect;
export type NewCommsTemplate = typeof commsTemplate.$inferInsert;
