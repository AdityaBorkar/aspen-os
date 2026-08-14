import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { dmsEntityTypeEnum } from "./enums";

export const dmsEntityLabel = pgTable(
  "dms_entity_label",
  {
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
    appliedBy: text("applied_by").notNull(),
    entityId: text("entity_id").notNull(),
    entityType: dmsEntityTypeEnum("entity_type").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    labelId: text("label_id").notNull(),
  },
  (table) => [
    uniqueIndex("idx_dms_entity_label_unique").on(table.entityType, table.entityId, table.labelId),
    index("idx_dms_entity_label_label").on(table.labelId),
    index("idx_dms_entity_label_entity").on(table.entityType, table.entityId),
  ],
);

export type DmsEntityLabel = typeof dmsEntityLabel.$inferSelect;
export type NewDmsEntityLabel = typeof dmsEntityLabel.$inferInsert;
