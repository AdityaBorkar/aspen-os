import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const fileMetadata = pgTable(
  "file_metadata",
  {
    archived: boolean("archived").default(false),
    archivedKey: text("archived_key"),
    bucket: text("bucket").notNull(),
    contentType: text("content_type"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    etag: text("etag"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    key: text("key").unique().notNull(),
    metadata: jsonb("metadata").default({}),
    size: bigint("size", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    archivedIdx: index("idx_file_metadata_archived").on(table.archived),
    keyIdx: index("idx_file_metadata_key").on(table.key),
  }),
);
