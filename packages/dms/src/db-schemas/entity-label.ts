import { dmsEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const dmsEntityLabel = pgTable(
  "dms_entity_label",
  {
    applied_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    applied_by: text().notNull(),
    entity_id: text().notNull(),
    entity_type: dmsEntityTypeEnum().notNull(),
    id: uuidv7().primaryKey(),
    label_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_dms_entity_label_unique").on(
      table.entity_type,
      table.entity_id,
      table.label_id,
    ),
    index("idx_dms_entity_label_label").on(table.label_id),
    index("idx_dms_entity_label_entity").on(table.entity_type, table.entity_id),
  ],
);

export type DmsEntityLabel = typeof dmsEntityLabel.$inferSelect;
export type NewDmsEntityLabel = typeof dmsEntityLabel.$inferInsert;
