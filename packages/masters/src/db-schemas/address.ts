import { masterEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterAddress = pgTable(
  "master_address",
  {
    city: text(),
    country: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    entity_id: text().notNull(),
    entity_type: masterEntityTypeEnum().notNull(),
    id: uuidv7().primaryKey(),
    label: text(),
    line1: text().notNull(),
    line2: text(),
    metadata: jsonb(),
    postal_code: text(),
    state: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_master_address_entity").on(table.entity_type, table.entity_id),
    index("idx_master_address_country").on(table.country),
  ],
);

export type MasterAddress = typeof masterAddress.$inferSelect;
export type NewMasterAddress = typeof masterAddress.$inferInsert;
