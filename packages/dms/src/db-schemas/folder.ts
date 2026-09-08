import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsFolder = pgTable(
  "dms_folder",
  {
    color: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    id: uuidv7().primaryKey(),
    is_trashed: boolean().notNull().default(false),
    name: text().notNull(),
    owner_id: text().notNull(),
    parent_id: text(),
    path: text().notNull().unique(),
    trashed_at: timestamp({ withTimezone: true }),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_dms_folder_parent").on(table.parent_id),
    index("idx_dms_folder_owner").on(table.owner_id),
    index("idx_dms_folder_path").on(table.path),
    index("idx_dms_folder_trashed").on(table.is_trashed),
  ],
);

export type DmsFolder = typeof dmsFolder.$inferSelect;
export type NewDmsFolder = typeof dmsFolder.$inferInsert;
