import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const driveItemTypeEnum = pgEnum("drive_item_type", ["file", "folder"]);

export const driveGranteeTypeEnum = pgEnum("drive_grantee_type", [
  "user",
  "group",
]);

export const drivePermissionEnum = pgEnum("drive_permission", [
  "viewer",
  "editor",
  "owner",
]);

export const drivePublicLinkPermissionEnum = pgEnum(
  "drive_public_link_permission",
  ["view", "edit"],
);

export const driveFolder = pgTable(
  "drive_folder",
  {
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isTrashed: boolean("is_trashed").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    parentId: text("parent_id"),
    path: text("path").notNull().unique(),
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_drive_folder_parent").on(table.parentId),
    index("idx_drive_folder_owner").on(table.ownerId),
    index("idx_drive_folder_path").on(table.path),
    index("idx_drive_folder_trashed").on(table.isTrashed),
  ],
);

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
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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

export const driveFileVersion = pgTable(
  "drive_file_version",
  {
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    etag: text("etag"),
    fileId: text("file_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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

export const driveLabel = pgTable(
  "drive_label",
  {
    color: text("color").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isGlobal: boolean("is_global").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id"),
  },
  (table) => [
    index("idx_drive_label_owner").on(table.ownerId),
    index("idx_drive_label_global").on(table.isGlobal),
  ],
);

export const driveItemLabel = pgTable(
  "drive_item_label",
  {
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    appliedBy: text("applied_by").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    itemId: text("item_id").notNull(),
    itemType: driveItemTypeEnum("item_type").notNull(),
    labelId: text("label_id").notNull(),
  },
  (table) => [
    uniqueIndex("idx_drive_item_label_unique").on(
      table.itemId,
      table.itemType,
      table.labelId,
    ),
    index("idx_drive_item_label_label").on(table.labelId),
    index("idx_drive_item_label_item").on(table.itemId, table.itemType),
  ],
);

export const driveShare = pgTable(
  "drive_share",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    granteeId: text("grantee_id").notNull(),
    granteeType: driveGranteeTypeEnum("grantee_type").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    itemId: text("item_id").notNull(),
    itemType: driveItemTypeEnum("item_type").notNull(),
    message: text("message"),
    permission: drivePermissionEnum("permission").notNull(),
    sharedBy: text("shared_by").notNull(),
  },
  (table) => [
    index("idx_drive_share_item").on(table.itemId, table.itemType),
    index("idx_drive_share_grantee").on(table.granteeId, table.granteeType),
  ],
);

export const drivePublicLink = pgTable(
  "drive_public_link",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    itemId: text("item_id").notNull(),
    itemType: driveItemTypeEnum("item_type").notNull(),
    maxViews: integer("max_views"),
    password: text("password"),
    permission: drivePublicLinkPermissionEnum("permission")
      .notNull()
      .default("view"),
    token: text("token").notNull().unique(),
    viewCount: integer("view_count").notNull().default(0),
  },
  (table) => [
    index("idx_drive_public_link_item").on(table.itemId, table.itemType),
    index("idx_drive_public_link_active").on(table.isActive),
  ],
);

export const driveAccessLog = pgTable(
  "drive_access_log",
  {
    accessedBy: text("accessed_by"),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    ip: text("ip"),
    itemId: text("item_id").notNull(),
    itemType: driveItemTypeEnum("item_type").notNull(),
    publicLinkId: text("public_link_id"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("idx_drive_access_log_item").on(table.itemId, table.itemType),
    index("idx_drive_access_log_public_link").on(table.publicLinkId),
    index("idx_drive_access_log_created").on(table.createdAt),
  ],
);

export const driveTables = {
  driveAccessLog,
  driveFile,
  driveFileVersion,
  driveFolder,
  driveItemLabel,
  driveLabel,
  drivePublicLink,
  driveShare,
} as const;
