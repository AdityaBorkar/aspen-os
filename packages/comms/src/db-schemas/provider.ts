import { commsProviderKindEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsProvider = pgTable(
  "comms_provider",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    credential_ref: text().notNull(),
    default_sender_address: text(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    kind: commsProviderKindEnum().notNull(),
    metadata: jsonb().$type<Record<string, JsonValue> | null>(),
    name: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_comms_provider_kind").on(table.kind),
    index("idx_comms_provider_active").on(table.is_active),
  ],
);

export type CommsProvider = typeof commsProvider.$inferSelect;
export type NewCommsProvider = typeof commsProvider.$inferInsert;
