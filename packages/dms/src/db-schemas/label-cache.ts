import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsLabelCache = pgTable(
  "dms_label_cache",
  {
    color: text(),
    id: text().primaryKey(),
    name: text().notNull(),
    scope_id: text(),
    scope_type: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_dms_label_cache_name").on(table.name),
    index("idx_dms_label_cache_scope").on(table.scope_type, table.scope_id),
  ],
);

export type DmsLabelCache = typeof dmsLabelCache.$inferSelect;
export type NewDmsLabelCache = typeof dmsLabelCache.$inferInsert;
