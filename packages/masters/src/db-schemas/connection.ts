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
    baseUrl: text("base_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    credentialRef: text("credential_ref").notNull(),
    description: text("description"),
    entityId: text("entity_id").notNull(),
    entityType: masterEntityTypeEnum("entity_type").notNull(),
    id: uuidv7("id").primaryKey(),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    status: masterConnectionStatusEnum("status").notNull().default("active"),
    type: masterIntegrationTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_master_connection_entity").on(table.entityType, table.entityId),
    index("idx_master_connection_status").on(table.status),
    index("idx_master_connection_type").on(table.type),
  ],
);

export type MasterConnection = typeof masterConnection.$inferSelect;
export type NewMasterConnection = typeof masterConnection.$inferInsert;
