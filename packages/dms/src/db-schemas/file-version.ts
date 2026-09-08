import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const dmsFileVersion = pgTable(
  "dms_file_version",
  {
    compression: jsonb().$type<JsonValue | null>(),
    content_type: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    etag: text(),
    file_id: text().notNull(),
    id: uuidv7().primaryKey(),
    is_current: boolean().notNull().default(false),
    name: text(),
    size: bigint({ mode: "number" }).notNull(),
    storage_key: text().notNull(),
    uploaded_by: text().notNull(),
    version: integer().notNull(),
  },
  (table) => [
    index("idx_dms_file_version_file").on(table.file_id),
    uniqueIndex("idx_dms_file_version_file_ver").on(table.file_id, table.version),
  ],
);

export type DmsFileVersion = typeof dmsFileVersion.$inferSelect;
export type NewDmsFileVersion = typeof dmsFileVersion.$inferInsert;
