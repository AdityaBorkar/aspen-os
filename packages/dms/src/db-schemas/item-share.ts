import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { dmsItemGranteeTypeEnum, dmsItemPermissionEnum, dmsItemTypeEnum } from "./enums";

export const dmsItemShare = pgTable(
  "dms_item_share",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    granteeId: text("grantee_id").notNull(),
    granteeType: dmsItemGranteeTypeEnum("grantee_type").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    itemId: text("item_id").notNull(),
    itemType: dmsItemTypeEnum("item_type").notNull(),
    message: text("message"),
    permission: dmsItemPermissionEnum("permission").notNull(),
    sharedBy: text("shared_by").notNull(),
  },
  (table) => [
    index("idx_dms_item_share_item").on(table.itemId, table.itemType),
    index("idx_dms_item_share_grantee").on(table.granteeId, table.granteeType),
  ],
);

export type DmsItemShare = typeof dmsItemShare.$inferSelect;
export type NewDmsItemShare = typeof dmsItemShare.$inferInsert;
