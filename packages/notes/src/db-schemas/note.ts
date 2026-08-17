import { notesAccessEnum, notesNoteTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const note = pgTable(
  "note",
  {
    access: notesAccessEnum("access").notNull().default("personal"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuidv7("id").primaryKey(),
    metadata: jsonb("metadata").notNull().default({}),
    ownerId: text("owner_id").notNull(),
    scopeId: text("scope_id"),
    scopeType: text("scope_type"),
    tags: text("tags").array().notNull().default([]),
    title: text("title"),
    type: notesNoteTypeEnum("type").notNull().default("general"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_note_owner").on(table.ownerId),
    index("idx_note_access").on(table.access),
    index("idx_note_scope").on(table.scopeType, table.scopeId),
  ],
);

export type Note = typeof note.$inferSelect;
export type NewNote = typeof note.$inferInsert;
