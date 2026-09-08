import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const masterLabel = pgTable(
  "master_label",
  {
    color: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    scope_id: text(),
    scope_type: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_master_label_scope").on(table.scope_type, table.scope_id),
    index("idx_master_label_name").on(table.name),
    unique("uq_master_label_scope_name")
      .on(table.scope_type, table.scope_id, table.name)
      .nullsNotDistinct(),
  ],
);

export type MasterLabel = typeof masterLabel.$inferSelect;
export type NewMasterLabel = typeof masterLabel.$inferInsert;
