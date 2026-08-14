import { uuidv7 } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { DOCUMENT_STATUS } from "../utils/constants";

export const dmsDocumentStatusEnum = pgEnum("dms_document_status", [
  DOCUMENT_STATUS.TRIAGED,
  DOCUMENT_STATUS.ACTIVE,
  DOCUMENT_STATUS.EXPIRED,
  DOCUMENT_STATUS.DELETED,
]);

export const dmsDocument = pgTable(
  "dms_document",
  {
    batchId: text("batch_id"),
    classId: text("class_id"),
    compression: jsonb("compression"),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
    docNumber: text("doc_number").notNull().unique(),
    etag: text("etag"),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    expiryDate: date("expiry_date"),
    fieldValues: jsonb("field_values"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    status: dmsDocumentStatusEnum("status").notNull().default("triaged"),
    storageKey: text("storage_key").notNull(),
    tags: jsonb("tags")
      .notNull()
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    uploadedBy: text("uploaded_by").notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("idx_dms_document_search").using(
      "gin",
      sql`(
        to_tsvector('simple', name)
        || to_tsvector('simple', coalesce(array_to_string(tags::text[], ' '), ''))
        || to_tsvector('simple', coalesce(metadata::text, ''))
        || to_tsvector('simple', coalesce(field_values::text, ''))
      )`,
    ),
    index("idx_dms_document_status").on(table.status),
    index("idx_dms_document_class").on(table.classId),
    index("idx_dms_document_batch").on(table.batchId),
    index("idx_dms_document_owner").on(table.ownerId),
    index("idx_dms_document_uploader").on(table.uploadedBy),
    index("idx_dms_document_expiry").on(table.expiryDate),
  ],
);

export type DmsDocument = typeof dmsDocument.$inferSelect;
export type NewDmsDocument = typeof dmsDocument.$inferInsert;
