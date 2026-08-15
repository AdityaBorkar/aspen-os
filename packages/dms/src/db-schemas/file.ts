import { dmsFileStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { bigint, date, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsFile = pgTable(
  "dms_file",
  {
    batchId: text("batch_id"),
    classId: text("class_id"),
    compression: jsonb("compression"),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
    description: text("description"),
    docNumber: text("doc_number"),
    etag: text("etag"),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    expiryDate: date("expiry_date"),
    fieldValues: jsonb("field_values"),
    folderId: text("folder_id"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    path: text("path"),
    size: bigint("size", { mode: "number" }).notNull(),
    status: dmsFileStatusEnum("status").notNull().default("triaged"),
    storageKey: text("storage_key").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    uploadedBy: text("uploaded_by").notNull(),
    version: integer("version").notNull().default(1),
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
    index("idx_dms_file_folder").on(table.folderId),
    index("idx_dms_file_class").on(table.classId),
    index("idx_dms_file_status").on(table.status),
    index("idx_dms_file_owner").on(table.ownerId),
    index("idx_dms_file_batch").on(table.batchId),
    index("idx_dms_file_expiry").on(table.expiryDate),
    index("idx_dms_file_path").on(table.path),
  ],
);

export type DmsFile = typeof dmsFile.$inferSelect;
export type NewDmsFile = typeof dmsFile.$inferInsert;
