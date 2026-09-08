import { dmsFileStatusEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { bigint, date, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsFile = pgTable(
  "dms_file",
  {
    batch_id: text(),
    class_id: text(),
    compression: jsonb().$type<JsonValue | null>(),
    content_type: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deleted_at: timestamp({ withTimezone: true }),
    deleted_by: text(),
    description: text(),
    doc_number: text(),
    etag: text(),
    expired_at: timestamp({ withTimezone: true }),
    expiry_date: date(),
    field_values: jsonb().$type<Record<string, JsonValue> | null>(),
    folder_id: text(),
    id: uuidv7().primaryKey(),
    metadata: jsonb().$type<Record<string, JsonValue> | null>(),
    name: text().notNull(),
    owner_id: text().notNull(),
    path: text(),
    size: bigint({ mode: "number" }).notNull(),
    status: dmsFileStatusEnum().notNull().default("triaged"),
    storage_key: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    uploaded_by: text().notNull(),
    version: integer().notNull().default(1),
  },
  (table) => [
    index("idx_dms_file_search").using(
      "gin",
      sql`(
        to_tsvector('simple', name)
        || to_tsvector('simple', coalesce(description, ''))
        || to_tsvector('simple', coalesce(metadata::text, ''))
        || to_tsvector('simple', coalesce(field_values::text, ''))
      )`,
    ),
    index("idx_dms_file_folder").on(table.folder_id),
    index("idx_dms_file_class").on(table.class_id),
    index("idx_dms_file_status").on(table.status),
    index("idx_dms_file_owner").on(table.owner_id),
    index("idx_dms_file_batch").on(table.batch_id),
    index("idx_dms_file_expiry").on(table.expiry_date),
    index("idx_dms_file_path").on(table.path),
  ],
);

export type DmsFile = typeof dmsFile.$inferSelect;
export type NewDmsFile = typeof dmsFile.$inferInsert;
