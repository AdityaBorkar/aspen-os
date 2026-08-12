import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { driveItemTypeEnum } from "./enums";

export const driveItemLabel = pgTable(
  "drive_item_label",
  {
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    appliedBy: text("applied_by").notNull(),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    itemId: text("item_id").notNull(),
    itemType: driveItemTypeEnum("item_type").notNull(),
    labelId: text("label_id").notNull(),
  },
  (table) => [
    uniqueIndex("idx_drive_item_label_unique").on(
      table.itemId,
      table.itemType,
      table.labelId,
    ),
    index("idx_drive_item_label_label").on(table.labelId),
    index("idx_drive_item_label_item").on(table.itemId, table.itemType),
  ],
);
