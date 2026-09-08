import { uuidv7 } from "#/server/db/schema/data-types";

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const fileMetadata = pgTable(
  "file_metadata",
  {
    archived: boolean().default(false),
    archived_key: text(),
    bucket: text().notNull(),
    content_type: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    etag: text(),
    id: uuidv7().primaryKey(),
    key: text().notNull(),
    metadata: jsonb().default({}),
    size: bigint({ mode: "number" }).notNull().default(0),
    tenant_id: text()
      .notNull()
      .default(sql`COALESCE(current_setting('app.tenant_id', true), 'default')`),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    archivedIdx: index("idx_file_metadata_archived").on(table.archived),
    keyIdx: index("idx_file_metadata_key").on(table.key),
    keyTenantUnique: uniqueIndex("file_metadata_key_tenant_unique").on(table.key, table.tenant_id),
  }),
);
