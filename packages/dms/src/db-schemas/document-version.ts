import { sql } from "drizzle-orm";
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

export const dmsDocumentVersion = pgTable(
  "dms_document_version",
  {
    compression: jsonb("compression"),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    documentId: text("document_id").notNull(),
    etag: text("etag"),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    isCurrent: boolean("is_current").notNull().default(false),
    name: text("name").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    version: integer("version").notNull(),
  },
  (table) => [
    index("idx_dms_document_version_document").on(table.documentId),
    uniqueIndex("idx_dms_document_version_doc_ver").on(
      table.documentId,
      table.version,
    ),
  ],
);

export type DmsDocumentVersion = typeof dmsDocumentVersion.$inferSelect;
export type NewDmsDocumentVersion = typeof dmsDocumentVersion.$inferInsert;
