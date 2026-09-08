import { masterContactTypeEnum, masterEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterContact = pgTable(
  "master_contact",
  {
    company: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text(),
    deletion_reason: text(),
    email: text(),
    entity_id: text(),
    entity_type: masterEntityTypeEnum(),
    first_name: text(),
    id: uuidv7().primaryKey(),
    is_removed: boolean().notNull().default(false),
    last_name: text(),
    linked_user_id: text(),
    metadata: jsonb(),
    name: text().notNull(),
    phone: text(),
    removed_at: timestamp({ withTimezone: true }),
    title: text(),
    type: masterContactTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_master_contact_email").on(table.email),
    index("idx_master_contact_entity").on(table.entity_type, table.entity_id),
    index("idx_master_contact_type").on(table.type),
  ],
);

export type MasterContact = typeof masterContact.$inferSelect;
export type NewMasterContact = typeof masterContact.$inferInsert;
