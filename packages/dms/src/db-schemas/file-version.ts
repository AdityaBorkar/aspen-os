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
    compression: jsonb("compression"),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    etag: text("etag"),
    fileId: text("file_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isCurrent: boolean("is_current").notNull().default(false),
    name: text("name"),
    size: bigint("size", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    version: integer("version").notNull(),
  },
  (table) => [
    index("idx_dms_file_version_file").on(table.fileId),
    uniqueIndex("idx_dms_file_version_file_ver").on(table.fileId, table.version),
  ],
);

export type DmsFileVersion = typeof dmsFileVersion.$inferSelect;
export type NewDmsFileVersion = typeof dmsFileVersion.$inferInsert;
