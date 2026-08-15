import { masterContactTypeEnum, masterEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterContact = pgTable(
  "master_contact",
  {
    company: text("company"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    email: text("email"),
    entityId: text("entity_id").notNull(),
    entityType: masterEntityTypeEnum("entity_type").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isPrimary: boolean("is_primary").notNull().default(false),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    phone: text("phone"),
    title: text("title"),
    type: masterContactTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_master_contact_entity").on(table.entityType, table.entityId),
    index("idx_master_contact_type").on(table.type),
    index("idx_master_contact_is_primary").on(table.isPrimary),
  ],
);

export type MasterContact = typeof masterContact.$inferSelect;
export type NewMasterContact = typeof masterContact.$inferInsert;
