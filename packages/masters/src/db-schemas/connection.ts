import {
  masterConnectionStatusEnum,
  masterEntityTypeEnum,
  masterIntegrationTypeEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterConnection = pgTable(
  "master_connection",
  {
    base_url: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    credential_ref: text().notNull(),
    description: text(),
    entity_id: text().notNull(),
    entity_type: masterEntityTypeEnum().notNull(),
    id: uuidv7().primaryKey(),
    last_tested_at: timestamp({ withTimezone: true }),
    last_used_at: timestamp({ withTimezone: true }),
    metadata: jsonb(),
    name: text().notNull(),
    status: masterConnectionStatusEnum().notNull().default("active"),
    type: masterIntegrationTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_master_connection_entity").on(table.entity_type, table.entity_id),
    index("idx_master_connection_status").on(table.status),
    index("idx_master_connection_type").on(table.type),
  ],
);

export type MasterConnection = typeof masterConnection.$inferSelect;
export type NewMasterConnection = typeof masterConnection.$inferInsert;
