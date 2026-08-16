import { commsProviderKindEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const commsProvider = pgTable(
  "comms_provider",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    credentialRef: text("credential_ref").notNull(),
    defaultSenderAddress: text("default_sender_address"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isActive: boolean("is_active").notNull().default(true),
    kind: commsProviderKindEnum("kind").notNull(),
    metadata: jsonb("metadata").$type<Record<string, JsonValue> | null>(),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_comms_provider_kind").on(table.kind),
    index("idx_comms_provider_active").on(table.isActive),
  ],
);

export type CommsProvider = typeof commsProvider.$inferSelect;
export type NewCommsProvider = typeof commsProvider.$inferInsert;
