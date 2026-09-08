import { masterContactTypeEnum, masterEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterContact = pgTable(
  "master_contact",
  {
    company: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    email: text(),
    entity_id: text().notNull(),
    entity_type: masterEntityTypeEnum().notNull(),
    id: uuidv7().primaryKey(),
    metadata: jsonb(),
    name: text().notNull(),
    phone: text(),
    title: text(),
    type: masterContactTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_master_contact_entity").on(table.entity_type, table.entity_id),
    index("idx_master_contact_type").on(table.type),
  ],
);

export type MasterContact = typeof masterContact.$inferSelect;
export type NewMasterContact = typeof masterContact.$inferInsert;
