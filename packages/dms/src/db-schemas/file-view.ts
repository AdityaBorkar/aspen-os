import type { FileViewCondition, FileViewSort } from "#/schemas/file-view";

import { uuidv7 } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsFileView = pgTable(
  "dms_file_view",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    filters: jsonb("filters")
      .notNull()
      .$type<FileViewCondition[]>()
      .default(sql`'[]'::jsonb`),
    id: uuidv7("id").primaryKey(),
    isDefault: boolean("is_default").notNull().default(false),
    isShared: boolean("is_shared").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    sort: jsonb("sort")
      .notNull()
      .$type<FileViewSort[]>()
      .default(sql`'[]'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_dms_file_view_owner").on(table.ownerId),
    index("idx_dms_file_view_shared").on(table.isShared),
  ],
);

export type DmsFileView = typeof dmsFileView.$inferSelect;
export type NewDmsFileView = typeof dmsFileView.$inferInsert;
