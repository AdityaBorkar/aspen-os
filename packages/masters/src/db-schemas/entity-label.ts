import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const masterEntityLabel = pgTable(
  "master_entity_label",
  {
    applied_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    applied_by: text().notNull(),
    entity_id: text().notNull(),
    entity_type: text().notNull(),
    id: uuidv7().primaryKey(),
    label_id: text().notNull(),
  },
  (table) => [
    unique("uq_master_entity_label_unique").on(table.entity_type, table.entity_id, table.label_id),
    index("idx_master_entity_label_label").on(table.label_id),
    index("idx_master_entity_label_entity").on(table.entity_type, table.entity_id),
  ],
);

export type MasterEntityLabel = typeof masterEntityLabel.$inferSelect;
export type NewMasterEntityLabel = typeof masterEntityLabel.$inferInsert;
