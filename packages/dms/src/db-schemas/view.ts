import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const dmsView = pgTable(
  "dms_view",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    filters: jsonb("filters")
      .notNull()
      .$type<Record<string, unknown>[]>()
      .default(sql`'[]'::jsonb`),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    isDefault: boolean("is_default").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    isShared: boolean("is_shared").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    sort: jsonb("sort")
      .notNull()
      .$type<Record<string, unknown>[]>()
      .default(sql`'[]'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_dms_view_owner").on(table.ownerId),
    index("idx_dms_view_shared").on(table.isShared),
  ],
);

export type DmsView = typeof dmsView.$inferSelect;
export type NewDmsView = typeof dmsView.$inferInsert;
