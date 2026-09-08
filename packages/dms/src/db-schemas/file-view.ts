import type { FileViewCondition, FileViewSort } from "#/schemas/file-view";

import { uuidv7 } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsFileView = pgTable(
  "dms_file_view",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    filters: jsonb()
      .notNull()
      .$type<FileViewCondition[]>()
      .default(sql`'[]'::jsonb`),
    id: uuidv7().primaryKey(),
    is_default: boolean().notNull().default(false),
    is_shared: boolean().notNull().default(false),
    name: text().notNull(),
    owner_id: text().notNull(),
    sort: jsonb()
      .notNull()
      .$type<FileViewSort[]>()
      .default(sql`'[]'::jsonb`),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_dms_file_view_owner").on(table.owner_id),
    index("idx_dms_file_view_shared").on(table.is_shared),
  ],
);

export type DmsFileView = typeof dmsFileView.$inferSelect;
export type NewDmsFileView = typeof dmsFileView.$inferInsert;
