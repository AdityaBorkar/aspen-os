import { PIN_ITEM_TYPE } from "#/utils/constants";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const dmsPinItemTypeEnum = pgEnum("dms_pin_item_type", [
  PIN_ITEM_TYPE.TRIAGE,
  PIN_ITEM_TYPE.FILE_VIEW,
  PIN_ITEM_TYPE.CLASS,
]);

export const dmsPin = pgTable(
  "dms_pin",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    itemId: text("item_id").notNull(),
    itemType: dmsPinItemTypeEnum("item_type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_dms_pin_user").on(table.userId),
    uniqueIndex("idx_dms_pin_user_item").on(table.userId, table.itemType, table.itemId),
  ],
);

export type DmsPin = typeof dmsPin.$inferSelect;
export type NewDmsPin = typeof dmsPin.$inferInsert;
