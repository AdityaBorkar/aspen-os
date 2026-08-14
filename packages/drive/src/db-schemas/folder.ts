import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const driveFolder = pgTable(
  "drive_folder",
  {
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    description: text("description"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isTrashed: boolean("is_trashed").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    parentId: text("parent_id"),
    path: text("path").notNull().unique(),
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_drive_folder_parent").on(table.parentId),
    index("idx_drive_folder_owner").on(table.ownerId),
    index("idx_drive_folder_path").on(table.path),
    index("idx_drive_folder_trashed").on(table.isTrashed),
  ],
);
