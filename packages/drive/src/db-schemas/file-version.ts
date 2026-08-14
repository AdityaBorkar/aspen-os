import { uuidv7 } from "@aspen-os/platform/server";
import { bigint, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const driveFileVersion = pgTable(
  "drive_file_version",
  {
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    etag: text("etag"),
    fileId: text("file_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    size: bigint("size", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    version: integer("version").notNull(),
  },
  (table) => [
    index("idx_drive_file_version_file").on(table.fileId),
    index("idx_drive_file_version_version").on(table.fileId, table.version),
  ],
);
