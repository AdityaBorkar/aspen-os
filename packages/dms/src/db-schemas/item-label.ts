import { uuidv7 } from "@aspen-os/platform/server";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { dmsItemTypeEnum } from "./enums";

export const dmsItemLabel = pgTable(
  "dms_item_label",
  {
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    appliedBy: text("applied_by").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    itemId: text("item_id").notNull(),
    itemType: dmsItemTypeEnum("item_type").notNull(),
    labelId: text("label_id").notNull(),
  },
  (table) => [
    uniqueIndex("idx_dms_item_label_unique").on(
      table.itemId,
      table.itemType,
      table.labelId,
    ),
    index("idx_dms_item_label_label").on(table.labelId),
    index("idx_dms_item_label_item").on(table.itemId, table.itemType),
  ],
);

export type DmsItemLabel = typeof dmsItemLabel.$inferSelect;
export type NewDmsItemLabel = typeof dmsItemLabel.$inferInsert;
