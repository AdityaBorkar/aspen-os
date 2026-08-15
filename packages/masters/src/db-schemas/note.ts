import { masterEntityTypeEnum, masterNoteTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterNote = pgTable(
  "master_note",
  {
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    entityId: text("entity_id").notNull(),
    entityType: masterEntityTypeEnum("entity_type").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    type: masterNoteTypeEnum("type").notNull().default("general"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_master_note_entity").on(table.entityType, table.entityId),
    index("idx_master_note_type").on(table.type),
  ],
);

export type MasterNote = typeof masterNote.$inferSelect;
export type NewMasterNote = typeof masterNote.$inferInsert;
