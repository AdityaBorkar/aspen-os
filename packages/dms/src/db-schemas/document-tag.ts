import { uuidv7 } from "@aspen-os/platform/server";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const dmsDocumentTag = pgTable(
  "dms_document_tag",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    documentId: text("document_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    tagId: text("tag_id").notNull(),
  },
  (table) => [
    index("idx_dms_document_tag_document").on(table.documentId),
    uniqueIndex("idx_dms_document_tag_doc_tag").on(
      table.documentId,
      table.tagId,
    ),
  ],
);

export type DmsDocumentTag = typeof dmsDocumentTag.$inferSelect;
export type NewDmsDocumentTag = typeof dmsDocumentTag.$inferInsert;
