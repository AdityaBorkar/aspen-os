import { masterEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterAddress = pgTable(
  "master_address",
  {
    city: text("city"),
    country: text("country").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    entityId: text("entity_id").notNull(),
    entityType: masterEntityTypeEnum("entity_type").notNull(),
    id: uuidv7("id").primaryKey(),
    isPrimary: boolean("is_primary").notNull().default(false),
    label: text("label"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    metadata: jsonb("metadata"),
    postalCode: text("postal_code"),
    state: text("state"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_master_address_entity").on(table.entityType, table.entityId),
    index("idx_master_address_country").on(table.country),
    index("idx_master_address_is_primary").on(table.isPrimary),
  ],
);

export type MasterAddress = typeof masterAddress.$inferSelect;
export type NewMasterAddress = typeof masterAddress.$inferInsert;
