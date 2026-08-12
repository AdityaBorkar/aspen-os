import { uuidv7 } from "@aspen-os/platform/server";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const driveFile = pgTable(
  "drive_file",
  {
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    etag: text("etag"),
    folderId: text("folder_id"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isTrashed: boolean("is_trashed").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    path: text("path").notNull().unique(),
    size: bigint("size", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull(),
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("idx_drive_file_folder").on(table.folderId),
    index("idx_drive_file_owner").on(table.ownerId),
    index("idx_drive_file_path").on(table.path),
    index("idx_drive_file_trashed").on(table.isTrashed),
  ],
);
