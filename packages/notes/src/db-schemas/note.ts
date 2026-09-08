import { notesAccessEnum, notesNoteTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const note = pgTable(
  "note",
  {
    access: notesAccessEnum().notNull().default("personal"),
    body: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    metadata: jsonb().notNull().default({}),
    owner_id: text().notNull(),
    scope_id: text(),
    scope_type: text(),
    tags: text().array().notNull().default([]),
    title: text(),
    type: notesNoteTypeEnum().notNull().default("general"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_note_owner").on(table.owner_id),
    index("idx_note_access").on(table.access),
    index("idx_note_scope").on(table.scope_type, table.scope_id),
  ],
);

export type Note = typeof note.$inferSelect;
export type NewNote = typeof note.$inferInsert;
