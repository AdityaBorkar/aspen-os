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
		id: text("id").primaryKey().default("gen_random_uuid()::text"),
		key: text("key").unique().notNull(),
		bucket: text("bucket").notNull(),
		size: bigint("size", { mode: "number" }).notNull().default(0),
		contentType: text("content_type"),
		etag: text("etag"),
		metadata: jsonb("metadata").default({}),
		archived: boolean("archived").default(false),
		archivedKey: text("archived_key"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		keyIdx: index("idx_file_metadata_key").on(table.key),
		archivedIdx: index("idx_file_metadata_archived").on(table.archived),
	}),
);
